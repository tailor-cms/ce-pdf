<template>
  <div class="d-flex flex-column ga-4">
    <VSwitch
      :model-value="element.data.allowDownload !== false"
      color="primary"
      label="Allow download"
      hide-details
      inset
      @update:model-value="saveData({ allowDownload: !!$event })"
    />
    <VTextField
      v-model="height"
      :rules="[validateHeight]"
      hint="Leave empty for automatic height"
      label="Viewer height"
      placeholder="Auto"
      prepend-inner-icon="mdi-arrow-expand-vertical"
      suffix="px"
      type="number"
      variant="outlined"
      clearable
      persistent-hint
      @blur="saveHeight"
      @click:clear="clearHeight"
      @keydown.enter="saveHeight"
    />
  </div>
</template>

<script setup lang="ts">
import type { Element, ElementData } from '@tailor-cms/ce-pdf-manifest';
import { ref, watch } from 'vue';

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 3000;

const props = defineProps<{ element: Element }>();
const emit = defineEmits<{ save: [data: ElementData] }>();

const toInput = (value?: number | null) => (value ? String(value) : '');
const parseHeight = (value: string | number | null): number | null => {
  if (value === null || value === '') return null;
  return Number(value);
};

const height = ref<string | null>(toInput(props.element.data.height));

watch(
  () => props.element.data.height,
  (value) => {
    if ((value ?? null) === parseHeight(height.value)) return;
    height.value = toInput(value);
  },
);

const validateHeight = (value: string | number | null) => {
  const parsed = parseHeight(value);
  if (parsed === null) return true;
  if (!Number.isInteger(parsed)) return 'Height must be a whole number';
  if (parsed < MIN_HEIGHT) return `Height must be at least ${MIN_HEIGHT}px`;
  if (parsed > MAX_HEIGHT) return `Height must be at most ${MAX_HEIGHT}px`;
  return true;
};

const saveData = (updates: Partial<ElementData>) => {
  emit('save', { ...props.element.data, ...updates });
};

const saveHeight = () => {
  if (validateHeight(height.value) !== true) return;
  const value = parseHeight(height.value);
  if (value === (props.element.data.height ?? null)) return;
  saveData({ height: value });
};

const clearHeight = () => {
  height.value = '';
  saveHeight();
};
</script>
