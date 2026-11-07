// pdf.js integration. Only loaded via a dynamic `import()` from PdfViewer.vue,
// so pdf.js (with its inlined worker and CSS) lands in a lazy chunk.
//
// Uses the legacy build: the modern one targets only the latest browsers and
// calls built-ins like `Map.prototype.getOrInsertComputed` (Chrome 145,
// Firefox 144, Safari 26.2) unpolyfilled. Legacy supports Firefox ESR,
// Chrome 125+ and Safari 18+.
//
// Import order matters: `pdf.mjs` sets `globalThis.pdfjsLib`, which
// `pdf_viewer.mjs` reads on evaluation. Static imports run in order, so
// another pdf.js copy on the page (edit and display bundles) can't swap the
// global in between.
import {
  AnnotationMode,
  getDocument,
  getPdfFilenameFromUrl,
  PDFWorker,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  EventBus,
  FindState,
  LinkTarget,
  PDFFindController,
  PDFLinkService,
  PDFViewer,
} from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import PdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker&inline';
import viewerCss from 'pdfjs-dist/legacy/web/pdf_viewer.css?inline';

import { bindZoomGestures } from './zoomGestures';

// Zoom factor (1 = 100%) or a pdf.js zoom preset
export type ZoomValue = number | 'page-width' | 'page-fit';

export interface FindResult {
  status: 'pending' | 'found' | 'not-found';
  // Index of the current match, and number of matches
  current: number;
  total: number;
}

export interface PdfViewerOptions {
  // Must be an absolutely positioned div with an empty div as first child
  container: HTMLDivElement;
  url: string;
  initialPage?: number;
  // Aborting destroys the viewer, also while the document is still loading
  signal?: AbortSignal;
  // Called once pages are laid out and the initial page is restored
  onPagesInit?: (pageNumber: number, pageCount: number) => void;
  onPageChange?: (pageNumber: number) => void;
  // `presetValue` is set for preset zoom levels (e.g. 'page-width')
  onScaleChange?: (scale: number, presetValue?: string) => void;
  onFindResult?: (result: FindResult) => void;
  // Called when a page's text layer is (re)rendered, e.g. after zooming
  onTextLayerRender?: () => void;
}

export interface PdfViewerHandle {
  readonly pageCount: number;
  readonly currentPage: number;
  goToPage: (pageNumber: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (value: ZoomValue) => void;
  find: (query: string, opts?: { again?: boolean; previous?: boolean }) => void;
  closeFind: () => void;
  download: () => Promise<void>;
  destroy: () => Promise<void>;
}

// `abortSignal` is supported by PDFViewer but missing from its typings
type ViewerConstructorOptions = ConstructorParameters<typeof PDFViewer>[0] & {
  abortSignal?: AbortSignal;
};

const STYLE_ID = 'tce-pdf-viewer-styles';
const SCALE_PRESETS = ['auto', 'page-actual', 'page-fit', 'page-width'];

let sharedWorker: PDFWorker | null = null;

// One worker shared by all viewers on the page, passed to `getDocument`
// explicitly so destroying one document doesn't tear it down for the others
const getWorker = () => {
  if (!sharedWorker || sharedWorker.destroyed) {
    sharedWorker = PDFWorker.create({ port: new PdfjsWorker() });
  }
  return sharedWorker;
};

const injectStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  // Don't force `color-scheme` on the host document
  style.textContent = viewerCss.replace(
    /(:root\s*\{[^}]*?)color-scheme:\s*light dark;?/g,
    '$1',
  );
  document.head.appendChild(style);
};

const saveFile = (data: Uint8Array, filename: string) => {
  const blob = new Blob([data as BlobPart], { type: 'application/pdf' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30_000);
};

// Match count updates carry no state and only follow a found match
const toFindStatus = (state?: number): FindResult['status'] => {
  if (state === FindState.PENDING) return 'pending';
  if (state === FindState.NOT_FOUND) return 'not-found';
  return 'found';
};

// Like browser find: only scroll when the match isn't visible, centering it.
// The container's `scroll-padding-bottom` is covered by the viewer controls.
const centerIfHidden = (element: HTMLElement, container: HTMLElement) => {
  const view = container.getBoundingClientRect();
  const match = element.getBoundingClientRect();
  const { scrollPaddingBottom } = getComputedStyle(container);
  const visibleBottom = view.bottom - (parseFloat(scrollPaddingBottom) || 0);
  const isHiddenX = match.left < view.left || match.right > view.right;
  const isHiddenY = match.top < view.top || match.bottom > visibleBottom;
  container.scrollBy({
    left: isHiddenX
      ? (match.left + match.right - view.left - view.right) / 2
      : 0,
    top: isHiddenY
      ? (match.top + match.bottom - view.top - view.bottom) / 2
      : 0,
  });
};

// pdf.js 6 scrolls search matches with the native `scrollIntoView`, which also
// scrolls the page around the viewer (mozilla/pdf.js#22009) and pins the match
// to the top. pdf.js still decides when to scroll; we swap in a container-only
// scroll for that call, relying on pdf.js calling the match's `scrollIntoView`
// synchronously. Revisit once #22009 is fixed upstream.
class ContainedFindController extends PDFFindController {
  #container: HTMLElement;

  constructor(
    container: HTMLElement,
    options: ConstructorParameters<typeof PDFFindController>[0],
  ) {
    super(options);
    this.#container = container;
  }

  override scrollMatchIntoView(
    params: Parameters<PDFFindController['scrollMatchIntoView']>[0],
  ) {
    const { element } = params;
    if (element) {
      element.scrollIntoView = () => centerIfHidden(element, this.#container);
    }
    try {
      super.scrollMatchIntoView(params);
    } finally {
      if (element) delete (element as Partial<HTMLElement>).scrollIntoView;
    }
  }
}

export async function createPdfViewer(
  options: PdfViewerOptions,
): Promise<PdfViewerHandle> {
  const { container, url, initialPage, signal } = options;
  const { onPagesInit, onPageChange, onScaleChange, onFindResult } = options;
  const { onTextLayerRender } = options;
  signal?.throwIfAborted();
  injectStyles();

  const abortController = new AbortController();
  const eventBus = new EventBus();
  const linkService = new PDFLinkService({
    eventBus,
    externalLinkTarget: LinkTarget.BLANK,
    externalLinkRel: 'noopener noreferrer nofollow',
  });
  const findController = new ContainedFindController(container, {
    eventBus,
    linkService,
  });
  const viewerOptions: ViewerConstructorOptions = {
    container,
    eventBus,
    linkService,
    findController,
    annotationMode: AnnotationMode.ENABLE,
    abortSignal: abortController.signal,
  };
  const viewer: PDFViewer = new PDFViewer(viewerOptions);
  linkService.setViewer(viewer);
  bindZoomGestures(container, viewer, abortController.signal);

  // Keep preset zoom levels (e.g. fit width) in sync with container size
  // changes (window resize...)
  const resizeObserver = new ResizeObserver(() => {
    const value = viewer.currentScaleValue;
    if (!viewer.pdfDocument || !SCALE_PRESETS.includes(value)) return;
    viewer.currentScaleValue = value;
  });
  resizeObserver.observe(container);

  const handleFindResult = ({
    state,
    matchesCount,
  }: {
    state?: number;
    matchesCount: { current: number; total: number };
  }) => {
    if (!onFindResult) return;
    const { current, total } = matchesCount;
    onFindResult({ status: toFindStatus(state), current, total });
  };

  eventBus.on('pagesinit', () => {
    viewer.currentScaleValue = 'page-width';
    const pageCount = viewer.pagesCount;
    if (initialPage && initialPage > 1 && initialPage <= pageCount) {
      viewer.currentPageNumber = initialPage;
    }
    onPagesInit?.(viewer.currentPageNumber, pageCount);
  });
  eventBus.on('pagechanging', ({ pageNumber }: { pageNumber: number }) =>
    onPageChange?.(pageNumber),
  );
  eventBus.on(
    'scalechanging',
    ({ scale, presetValue }: { scale: number; presetValue?: string }) =>
      onScaleChange?.(scale, presetValue),
  );
  eventBus.on('updatefindmatchescount', handleFindResult);
  eventBus.on('updatefindcontrolstate', handleFindResult);
  if (onTextLayerRender) eventBus.on('textlayerrendered', onTextLayerRender);

  let isDestroyed = false;
  let pdfDocument: PDFDocumentProxy | null = null;
  const loadingTask: PDFDocumentLoadingTask = getDocument({
    url,
    worker: getWorker(),
    enableXfa: false,
  });

  const destroy = async () => {
    if (isDestroyed) return;
    isDestroyed = true;
    resizeObserver.disconnect();
    abortController.abort();
    viewer.cleanup();
    linkService.setDocument(null);
    await loadingTask.destroy().catch(() => {});
  };
  const onAbort = () => {
    destroy().catch(() => {});
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    pdfDocument = await loadingTask.promise;
  } catch (err) {
    await destroy();
    throw err;
  }
  if (isDestroyed) throw new DOMException('Viewer destroyed', 'AbortError');
  viewer.setDocument(pdfDocument);
  linkService.setDocument(pdfDocument, null);

  const find: PdfViewerHandle['find'] = (query, opts = {}) => {
    eventBus.dispatch('find', {
      source: null,
      type: opts.again ? 'again' : '',
      query,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: !!opts.previous,
      matchDiacritics: false,
    });
  };

  return {
    get pageCount() {
      return viewer.pagesCount;
    },
    get currentPage() {
      return viewer.currentPageNumber;
    },
    goToPage: (pageNumber) => {
      const page = Math.round(pageNumber);
      if (page < 1 || page > viewer.pagesCount) return;
      viewer.currentPageNumber = page;
    },
    zoomIn: () => viewer.increaseScale(),
    zoomOut: () => viewer.decreaseScale(),
    // pdf.js takes presets and numeric zoom factors as the same setting
    setZoom: (value) => (viewer.currentScaleValue = String(value)),
    find,
    closeFind: () => eventBus.dispatch('findbarclose', { source: null }),
    download: async () => {
      if (!pdfDocument) return;
      const data = await pdfDocument.getData();
      saveFile(data, getPdfFilenameFromUrl(url, 'document.pdf'));
    },
    destroy,
  };
}
