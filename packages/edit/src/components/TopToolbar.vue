<template>
  <div class="d-flex align-center justify-center">
    <TailorFileInput
      :allowed-extensions="EXTENSIONS"
      :file-key="element.data.assets?.url"
      class="mx-auto"
      allow-url-source
      @delete="onDelete"
      @input="save"
      @upload="save"
    />
  </div>
</template>

<script setup lang="ts">
import type { Element, ElementData } from '@tailor-cms/ce-pdf-manifest';

const EXTENSIONS = ['.pdf'];

const props = defineProps<{ element: Element }>();
const emit = defineEmits<{ save: [data: ElementData] }>();

const save = ({ url, publicUrl }: Record<string, any>) => {
  const assets = { url };
  emit('save', { ...props.element.data, url: publicUrl, assets });
};

const onDelete = () => {
  emit('save', { ...props.element.data, url: null, assets: {} });
};
</script>

<style scoped></style>
