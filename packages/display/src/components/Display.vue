<template>
  <div v-if="element.data.url" class="tce-pdf-root">
    <PdfViewer
      :allow-download="element.data.allowDownload !== false"
      :height="element.data.height"
      :initial-page="initialPage"
      :url="element.data.url"
      @page-change="onPageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import type { Element } from '@tailor-cms/ce-pdf-manifest';
import type { PageChangeEvent } from '@tailor-cms/ce-pdf-viewer';
import { PdfViewer } from '@tailor-cms/ce-pdf-viewer';
import { throttle } from 'lodash-es';

interface Progress {
  currentPage: number;
  pageCount: number;
  viewedPages: number[];
}

const PROGRESS_UPDATE_INTERVAL = 3000;

const props = defineProps<{ element: Element; userState: any }>();
const emit = defineEmits<{ interaction: [data: Progress] }>();

// Restore the last visited page (read once, userState is refreshed after
// each interaction)
const initialPage = Number(props.userState?.currentPage) || undefined;

const progress = { currentPage: 1, pageCount: 0 };
const viewedPages = new Set<number>();

const getViewedPages = () => {
  const stored: unknown = props.userState?.viewedPages;
  const pages = Array.isArray(stored) ? stored : [];
  return [...new Set<number>([...pages, ...viewedPages])]
    .filter((it) => Number.isInteger(it) && it > 0)
    .sort((a, b) => a - b);
};

const emitProgress = throttle(() => {
  if (!progress.pageCount) return;
  emit('interaction', { ...progress, viewedPages: getViewedPages() });
}, PROGRESS_UPDATE_INTERVAL);

const onPageChange = ({ currentPage, pageCount }: PageChangeEvent) => {
  Object.assign(progress, { currentPage, pageCount });
  viewedPages.add(currentPage);
  emitProgress();
};

watch(
  () => props.element.data.url,
  () => {
    emitProgress.flush();
    viewedPages.clear();
    progress.pageCount = 0;
  },
);

onBeforeUnmount(() => emitProgress.flush());
</script>
