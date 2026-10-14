// pdf.js integration. This module is only ever loaded through a dynamic
// `import()` from PdfViewer.vue, so pdf.js (and its inlined worker and CSS)
// ends up in a separate chunk which is fetched only when a PDF is rendered.
//
// The legacy build is used on purpose: the modern build relies on very recent
// built-ins (e.g. `Map.prototype.getOrInsertComputed`) without polyfills,
// which breaks on older iOS Safari / Android WebView versions.
//
// Import order matters: `pdf.mjs` assigns `globalThis.pdfjsLib`, which
// `pdf_viewer.mjs` reads while being evaluated. Static imports are evaluated
// synchronously in order, so another pdf.js copy on the page (e.g. edit and
// display bundles) can't swap the global in between.
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

// `abortSignal` is supported by PDFViewer but missing from its typings
type PDFViewerOptions = ConstructorParameters<typeof PDFViewer>[0] & {
  abortSignal?: AbortSignal;
};

const STYLE_ID = 'tce-pdf-viewer-styles';
const SCALE_PRESETS = ['auto', 'page-actual', 'page-fit', 'page-width'];

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
}

// Zoom factor (1 = 100%) or a pdf.js zoom preset
export type ZoomValue = number | 'page-width' | 'page-fit';

export interface FindResult {
  status: 'pending' | 'found' | 'not-found';
  // Index of the current match, and number of matches
  current: number;
  total: number;
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

let sharedWorker: PDFWorker | null = null;

// One worker is shared by all viewers on the page. It is passed explicitly
// to `getDocument` so destroying a single document does not tear down the
// worker used by other viewers.
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

export async function createPdfViewer(
  options: PdfViewerOptions,
): Promise<PdfViewerHandle> {
  const { container, url, initialPage, signal } = options;
  const { onPagesInit, onPageChange, onScaleChange, onFindResult } = options;
  signal?.throwIfAborted();
  injectStyles();

  const abortController = new AbortController();
  const eventBus = new EventBus();
  const linkService = new PDFLinkService({
    eventBus,
    externalLinkTarget: LinkTarget.BLANK,
    externalLinkRel: 'noopener noreferrer nofollow',
  });
  const findController = new PDFFindController({ eventBus, linkService });
  const viewerOptions: PDFViewerOptions = {
    container,
    eventBus,
    linkService,
    findController,
    annotationMode: AnnotationMode.ENABLE,
    abortSignal: abortController.signal,
  };
  const viewer: PDFViewer = new PDFViewer(viewerOptions);
  linkService.setViewer(viewer);

  // Keep preset zoom levels (e.g. fit width) in sync with container size
  // changes (window resize, fullscreen toggle...)
  const resizeObserver = new ResizeObserver(() => {
    const value = viewer.currentScaleValue;
    if (!viewer.pdfDocument || !SCALE_PRESETS.includes(value)) return;
    viewer.currentScaleValue = value;
  });
  resizeObserver.observe(container);

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
  // Match count updates carry no state; they only follow a found match
  const toStatus = (state?: number): FindResult['status'] => {
    if (state === FindState.PENDING) return 'pending';
    if (state === FindState.NOT_FOUND) return 'not-found';
    return 'found';
  };
  const handleFindResult = ({
    state,
    matchesCount,
  }: {
    state?: number;
    matchesCount: { current: number; total: number };
  }) => {
    if (!onFindResult) return;
    const { current, total } = matchesCount;
    onFindResult({ status: toStatus(state), current, total });
  };
  eventBus.on('updatefindmatchescount', handleFindResult);
  eventBus.on('updatefindcontrolstate', handleFindResult);

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
