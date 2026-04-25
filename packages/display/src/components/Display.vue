<template>
  <div v-if="element.data.url" class="tce-pdf-root">
    <iframe
      :src="element.data.url"
      class="w-100"
      height="360"
      title="PDF Viewer"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import type { Element } from '@tailor-cms/ce-pdf-manifest';

defineProps<{ element: Element }>();
</script>

<style scoped>
.tce-pdf-root {
}
</style>
