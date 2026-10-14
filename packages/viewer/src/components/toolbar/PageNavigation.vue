<template>
  <div class="d-flex align-center ga-1">
    <VBtn
      v-if="!compact"
      :disabled="disabled || currentPage <= 1"
      aria-label="Previous page"
      icon="mdi-chevron-up"
      size="24"
      @click="emit('go-to', currentPage - 1)"
    />
    <VBtn
      v-if="!compact"
      :disabled="disabled || currentPage >= pageCount"
      aria-label="Next page"
      icon="mdi-chevron-down"
      size="24"
      @click="emit('go-to', currentPage + 1)"
    />
    <div class="d-flex align-center ga-2 ml-1 text-body-medium">
      <VTextField
        ref="input"
        v-model="pageInput"
        :disabled="disabled"
        :width="inputWidth"
        aria-label="Page number"
        bg-color="transparent"
        class="tce-pdf-page-input flex-0-0 text-body-medium"
        density="compact"
        inputmode="numeric"
        variant="solo-filled"
        flat
        hide-details
        single-line
        @keydown.enter="commit"
        @update:focused="onFocusChange"
      />
      <div class="d-flex text-medium-emphasis text-no-wrap">
        /
        <div class="mx-2">{{ pageCount || '–' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import type { VTextField } from 'vuetify/components';

const props = defineProps<{
  currentPage: number;
  pageCount: number;
  disabled: boolean;
  // Narrow viewers keep only the page input
  compact?: boolean;
}>();
const emit = defineEmits<{ 'go-to': [pageNumber: number] }>();

const input = useTemplateRef<InstanceType<typeof VTextField>>('input');
const pageInput = ref(String(props.currentPage));

watch(
  () => props.currentPage,
  (page) => (pageInput.value = String(page)),
);

// Fits the page count's digits plus the field's side padding
const inputWidth = computed(() => {
  const digits = Math.max(String(props.pageCount || 1).length, 2);
  return `calc(${digits}ch + 1rem)`;
});

const commit = () => {
  const page = Number.parseInt(pageInput.value, 10);
  const isValid = Number.isInteger(page) && page >= 1;
  if (isValid && page <= props.pageCount) emit('go-to', page);
  pageInput.value = String(props.currentPage);
};

// Select the number on focus so typing replaces it; go to it on blur
const onFocusChange = (isFocused: boolean) => {
  if (!isFocused) return commit();
  input.value?.$el.querySelector('input')?.select();
};
</script>

<style scoped>
/* 28px tall like the zoom level button, with narrow side padding. The
   field fixes its font at 16px; inherit `text-body-medium` like the total */
.tce-pdf-page-input :deep(.v-field) {
  font-size: inherit;
  letter-spacing: inherit;
  --v-input-control-height: 28px;
  --v-field-padding-top: 0px;
  --v-field-padding-bottom: 0px;
  --v-field-input-padding-top: 0px;
  --v-field-input-padding-bottom: 0px;
  --v-field-padding-start: 4px;
  --v-field-padding-end: 4px;
}

/* Solo fields only tint slightly on focus; add a clear focus ring */
.tce-pdf-page-input :deep(.v-field--focused) {
  outline: 2px solid rgb(var(--v-theme-primary));
}

.tce-pdf-page-input :deep(input) {
  text-align: center;
  font-variant-numeric: tabular-nums;
}
</style>
