<template>
  <div class="tce-pdf text-left">
    <TailorElementPlaceholder
      v-if="!element.data.url && isReadonly"
      :icon="manifest.ui.icon"
      :name="`${manifest.name} component`"
      is-readonly
    />
    <TailorFileInput
      v-else
      :allowed-extensions="EXTENSIONS"
      :file-key="element.data.assets?.url || element.data.url"
      :public-url="element.data.url"
      :readonly="isReadonly"
      :show-actions="isFocused"
      mode="dropzone"
      allow-url-source
      @delete="onDelete"
      @input="save"
      @upload="save"
    >
      <iframe
        :src="element.data.url ?? ''"
        class="d-block w-100"
        frameborder="0"
        height="360"
        title="PDF Viewer"
      ></iframe>
    </TailorFileInput>
  </div>
</template>

<script lang="ts" setup>
import type { Element, ElementData } from '@tailor-cms/ce-pdf-manifest';
import manifest from '@tailor-cms/ce-pdf-manifest';

const EXTENSIONS = ['.pdf'];

const props = defineProps<{
  element: Element;
  isDragged: boolean;
  isFocused: boolean;
  isReadonly: boolean;
}>();
const emit = defineEmits<{ save: [data: ElementData] }>();

const save = (payload: Record<string, any> | null) => {
  if (!payload) return;
  const { url, publicUrl } = payload;
  const assets = { url };
  emit('save', { ...props.element.data, url: publicUrl ?? url, assets });
};

const onDelete = () => {
  emit('save', { ...props.element.data, url: null, assets: {} });
};
</script>
