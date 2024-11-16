<template>
  <div class="tce-pdf">
    <ElementPlaceholder
      v-if="!element.data.url"
      :icon="manifest.ui.icon"
      :is-disabled="isDisabled"
      :is-focused="isFocused"
      :name="`${manifest.name} component`"
      active-icon="mdi-arrow-up"
      active-placeholder="toolbar to upload the pdf"
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
import { defineEmits, defineProps } from 'vue';
import type { Element } from '@tailor-cms/ce-pdf-manifest';
import { ElementPlaceholder } from '@tailor-cms/core-components';
import manifest from '@tailor-cms/ce-pdf-manifest';

defineEmits(['save']);
defineProps<{ element: Element; isFocused: boolean; isDisabled: boolean }>();
</script>

<style lang="scss" scoped>
.tce-pdf {
  text-align: left;
}
</style>
