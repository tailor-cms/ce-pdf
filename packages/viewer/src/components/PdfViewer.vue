<template>
  <div
    ref="root"
    class="tce-pdf-viewer position-relative d-flex flex-column overflow-hidden bg-surface text-left border rounded"
  >
    <div
      :style="viewportStyle"
      class="flex-0-0 position-relative bg-surface-light"
    >
      <!-- pdf.js requires an absolutely positioned scroll container -->
      <div
        ref="container"
        :class="{ 'tce-pdf-container--search': isSearchOpen }"
        class="tce-pdf-container position-absolute top-0 left-0 w-100 h-100 overflow-auto"
        tabindex="0"
      >
        <div class="pdfViewer"></div>
      </div>
      <div
        v-if="isLoading || error"
        class="position-absolute top-0 left-0 w-100 h-100 d-flex flex-column align-center justify-center ga-3 pa-6 bg-surface-light"
      >
        <VProgressCircular v-if="isLoading" color="primary" indeterminate />
        <template v-else>
          <VIcon color="error" icon="mdi-file-alert-outline" size="40" />
          <div class="text-body-large text-center">
            This PDF could not be displayed.
          </div>
          <VBtn
            :href="url"
            color="primary"
            prepend-icon="mdi-open-in-new"
            rel="noopener noreferrer"
            target="_blank"
            text="Open PDF"
            variant="tonal"
          />
        </template>
      </div>
    </div>
    <VDefaultsProvider :defaults="TOOLBAR_DEFAULTS">
      <div class="tce-pdf-dock ga-2">
        <VSlideYReverseTransition>
          <VSheet
            v-if="isSearchOpen"
            class="tce-pdf-pill tce-pdf-search-pill pa-2"
            color="transparent"
            rounded="pill"
            border
          >
            <SearchBar
              ref="searchBar"
              v-model="searchQuery"
              :result="findResult"
              @close="toggleSearch"
              @next="findNext"
              @search="find"
            />
          </VSheet>
        </VSlideYReverseTransition>
        <VSheet
          aria-label="PDF controls"
          class="tce-pdf-pill tce-pdf-controls-pill d-flex align-center pa-2"
          color="transparent"
          role="toolbar"
          rounded="pill"
          border
        >
          <PageNavigation
            :compact="isCompact"
            :current-page="currentPage"
            :disabled="!isReady"
            :page-count="pageCount"
            @go-to="goToPage"
          />
          <VDivider :length="20" class="mx-2 align-self-center" vertical />
          <ZoomControls
            :compact="isCompact"
            :disabled="!isReady"
            :scale="scale"
            :scale-preset="scalePreset"
            @zoom="setZoom"
            @zoom-in="zoomIn"
            @zoom-out="zoomOut"
          />
          <VDivider :length="20" class="mx-2 align-self-center" vertical />
          <DocumentActions
            :allow-download="allowDownload"
            :compact="isCompact"
            :disabled="!isReady"
            :is-search-open="isSearchOpen"
            :url="url"
            @download="download"
            @toggle-search="toggleSearch"
          />
        </VSheet>
      </div>
    </VDefaultsProvider>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from 'vue';
import { onClickOutside, useElementSize, useEventListener } from '@vueuse/core';

import type { FindResult, PdfViewerHandle, ZoomValue } from '../lib/pdfViewer';
import DocumentActions from './toolbar/DocumentActions.vue';
import PageNavigation from './toolbar/PageNavigation.vue';
import SearchBar from './toolbar/SearchBar.vue';
import ZoomControls from './toolbar/ZoomControls.vue';

export interface PageChangeEvent {
  currentPage: number;
  pageCount: number;
}

// Viewer width below which the pill drops zoom steps and moves secondary
// actions to an overflow menu, so it fits on one row
const COMPACT_WIDTH = 520;

const TOOLBAR_DEFAULTS = {
  VBtn: { size: 32, variant: 'text' },
  VIcon: { size: 20 },
};

const props = withDefaults(
  defineProps<{
    url: string;
    allowDownload?: boolean;
    // Viewer height in px; responsive height if not set
    height?: number | null;
    // Page to open once the document is loaded
    initialPage?: number;
  }>(),
  { allowDownload: true, height: null, initialPage: undefined },
);
const emit = defineEmits<{ 'page-change': [data: PageChangeEvent] }>();

const root = useTemplateRef<HTMLDivElement>('root');
const container = useTemplateRef<HTMLDivElement>('container');
const searchBar = useTemplateRef<InstanceType<typeof SearchBar>>('searchBar');

// Starts wide, so the full toolbar renders until the viewer is measured
const { width } = useElementSize(root, { width: COMPACT_WIDTH, height: 0 });
const isCompact = computed(() => width.value < COMPACT_WIDTH);

// pdf.js objects rely on private class fields; keep them out of Vue's
// reactivity system (proxies break private field access)
let handle: PdfViewerHandle | null = null;
let abortController: AbortController | null = null;

const isLoading = ref(false);
const isReady = ref(false);
const error = ref<unknown>(null);
const currentPage = ref(1);
const pageCount = ref(0);
const scale = ref(1);
const scalePreset = ref<string | undefined>();
const findResult = ref<FindResult | null>(null);
const isSearchOpen = ref(false);
const searchQuery = ref('');

const viewportStyle = computed(() => {
  if (props.height) return { height: `${props.height}px` };
  return { height: '70vh', minHeight: '400px' };
});

const setCurrentPage = (pageNumber: number) => {
  currentPage.value = pageNumber;
  if (!pageCount.value) return;
  emit('page-change', { currentPage: pageNumber, pageCount: pageCount.value });
};

const goToPage = (pageNumber: number) => handle?.goToPage(pageNumber);
const zoomIn = () => handle?.zoomIn();
const zoomOut = () => handle?.zoomOut();

const setZoom = (value: ZoomValue) => handle?.setZoom(value);

const find = (query: string) => {
  if (!handle) return;
  if (query) return handle.find(query);
  findResult.value = null;
  handle.closeFind();
};

const findNext = (previous: boolean) => {
  if (!searchQuery.value) return;
  handle?.find(searchQuery.value, { again: true, previous });
};

const toggleSearch = async () => {
  isSearchOpen.value = !isSearchOpen.value;
  if (isSearchOpen.value) {
    await nextTick();
    return searchBar.value?.focus();
  }
  searchQuery.value = '';
  find('');
  container.value?.focus();
};

const openSearch = async () => {
  if (!isSearchOpen.value) return toggleSearch();
  searchBar.value?.focus();
};

// pdf.js text layers are focusable (clicking the document focuses one) and
// are hidden while pages re-render, e.g. on zoom, which drops focus to the
// body. Move it back so the viewer's shortcuts keep working, unless the user
// has moved on: focused or clicked something outside the viewer.
let hasFocus = false;

useEventListener(document, 'focusin', (e) => {
  hasFocus = !!root.value?.contains(e.target as Node);
});

onClickOutside(root, () => (hasFocus = false));

const restoreFocus = () => {
  if (!hasFocus || document.activeElement !== document.body) return;
  container.value?.focus({ preventScroll: true });
};

// Viewer shortcuts, delegated so they work wherever focus is within the viewer
useEventListener(root, 'keydown', (e) => {
  if (!isReady.value || !(e.ctrlKey || e.metaKey) || e.altKey) return;
  const actions: Record<string, () => unknown> = {
    '=': zoomIn,
    '+': zoomIn,
    '-': zoomOut,
    '0': () => setZoom('page-width'),
    f: openSearch,
  };
  const action = actions[e.key.toLowerCase()];
  if (!action) return;
  e.preventDefault();
  action();
});

const saveViaLink = (url: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = '';
  link.target = '_blank';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const download = async () => {
  try {
    if (!handle) throw new Error('PDF not loaded');
    await handle.download();
  } catch {
    saveViaLink(props.url);
  }
};

const destroyViewer = () => {
  abortController?.abort();
  abortController = null;
  handle = null;
  isReady.value = false;
  isLoading.value = false;
};

// pdf.js is loaded lazily, on the first document
const initViewer = async () => {
  destroyViewer();
  error.value = null;
  findResult.value = null;
  pageCount.value = 0;
  currentPage.value = 1;
  if (!props.url || !container.value) return;
  const controller = new AbortController();
  abortController = controller;
  isLoading.value = true;
  try {
    const { createPdfViewer } = await import('../lib/pdfViewer');
    const viewer = await createPdfViewer({
      container: container.value,
      url: props.url,
      initialPage: props.initialPage,
      signal: controller.signal,
      onPagesInit: (pageNumber, count) => {
        pageCount.value = count;
        setCurrentPage(pageNumber);
      },
      onPageChange: setCurrentPage,
      onScaleChange: (value, preset) => {
        scale.value = value;
        scalePreset.value = preset;
        requestAnimationFrame(restoreFocus);
      },
      onFindResult: (result) => (findResult.value = result),
      onTextLayerRender: restoreFocus,
    });
    if (controller.signal.aborted) return;
    handle = viewer;
    pageCount.value = viewer.pageCount;
    isReady.value = true;
    // Re-apply an open search to the new document
    if (searchQuery.value) find(searchQuery.value);
  } catch (err) {
    if (controller.signal.aborted) return;
    error.value = err;
  } finally {
    if (!controller.signal.aborted) isLoading.value = false;
  }
};

watch(() => props.url, initViewer);

onMounted(initViewer);
onBeforeUnmount(destroyViewer);
</script>

<style scoped>
/* Floats over the document without blocking it, except for the pills */
.tce-pdf-dock {
  position: absolute;
  right: 0.75rem;
  bottom: 1rem;
  left: 0.75rem;
  z-index: 10;
  /* Search pill takes the width of the controls, with enough room to type */
  display: grid;
  grid-template-columns: minmax(min(20rem, 100%), max-content);
  justify-content: center;
  pointer-events: none;
}

.tce-pdf-pill {
  max-width: 100%;
  pointer-events: auto;
  background-color: rgba(var(--v-theme-surface), 0.72);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 8px 24px rgba(0, 0, 0, 0.18);
}

.tce-pdf-controls-pill {
  justify-self: center;
}

.tce-pdf-search-pill:focus-within {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -1px;
}

.tce-pdf-container {
  /* Area covered by the pills; search scrolls matches out of it */
  --tce-pdf-pills-clearance: 5rem;
  scroll-padding-bottom: var(--tce-pdf-pills-clearance);
  outline: none;
  /* Pinch zooms the document (see lib/zoomGestures), not the page */
  touch-action: pan-x pan-y;
}

.tce-pdf-container--search {
  --tce-pdf-pills-clearance: 8.5rem;
}

/* Bottom padding lets the end of the document scroll clear of the pills */
.tce-pdf-container .pdfViewer {
  padding: 0.5rem 0 var(--tce-pdf-pills-clearance);
}

/*
 * Vuetify's reset makes every element inherit `box-sizing: border-box`.
 * pdf.js sizes `.page` (which has a transparent border) and its text layer
 * explicitly from the scale factor assuming `content-box`; with `border-box`
 * the canvas shrinks by the border width while the text layer does not, so
 * selection/search highlights drift right/down and get taller.
 */
.tce-pdf-container .pdfViewer,
.tce-pdf-container .pdfViewer :deep(.page) {
  box-sizing: content-box;
}

/*
 * Text layer spans are measured by pdf.js on a canvas; don't let typography
 * inherited from the host page change their rendered size
 */
.tce-pdf-container :deep(.textLayer) {
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  font-feature-settings: normal;
  font-stretch: normal;
  text-indent: 0;
  text-shadow: none;
  text-transform: none;
}
</style>
