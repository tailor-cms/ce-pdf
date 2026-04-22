<template>
  <div class="tce-pdf">
    <TailorElementPlaceholder
      v-if="!element.data.url"
      :icon="manifest.ui.icon"
      :is-disabled="isReadonly"
      :is-focused="isFocused"
      :name="`${manifest.name} component`"
      active-icon="mdi-arrow-up"
      active-placeholder="Use toolbar to upload the PDF"
    />
    <iframe
      v-else
      :src="element.data.url"
      class="d-block w-100"
      frameborder="0"
      height="360"
      title="PDF Viewer"
    ></iframe>
  </div>
</template>

<script lang="ts" setup>
import type { Element } from '@tailor-cms/ce-pdf-manifest';
import manifest from '@tailor-cms/ce-pdf-manifest';

defineProps<{
  element: Element;
  isDragged: boolean;
  isFocused: boolean;
  isReadonly: boolean;
}>();
</script>

<style lang="scss" scoped>
.tce-pdf {
  text-align: left;
}
</style>
