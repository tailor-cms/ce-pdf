<template>
  <div class="tce-pdf">
    <VSheet
      v-if="!element.data.url"
      class="d-flex justify-center align-center my-2 text-h6"
      height="15.5rem"
    >
      <VIcon :icon="manifest.ui.icon" start />
      {{ manifest.name }} placeholder
    </VSheet>
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
import manifest from '@tailor-cms/ce-pdf-manifest';

defineEmits(['save']);
defineProps<{ element: Element; isFocused: boolean; isDisabled: boolean }>();
</script>

<style lang="scss" scoped>
.tce-pdf {
  text-align: left;
}
</style>
