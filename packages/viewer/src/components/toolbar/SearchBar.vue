<template>
  <div class="d-flex align-center ga-1">
    <VTextField
      ref="input"
      :model-value="query"
      aria-label="Search in document"
      bg-color="transparent"
      class="tce-pdf-search mr-1"
      density="compact"
      placeholder="Search in document"
      prepend-inner-icon="mdi-magnify"
      variant="solo-filled"
      flat
      hide-details
      single-line
      @keydown.enter.prevent="emit('next', $event.shiftKey)"
      @keydown.esc="emit('close')"
      @update:model-value="onInput"
    >
      <template v-if="status" #append-inner>
        <span aria-live="polite" class="text-body-small text-no-wrap">
          {{ status }}
        </span>
      </template>
    </VTextField>
    <VBtn
      :disabled="!query"
      aria-label="Previous match"
      icon="mdi-chevron-up"
      @click="emit('next', true)"
    />
    <VBtn
      :disabled="!query"
      aria-label="Next match"
      icon="mdi-chevron-down"
      @click="emit('next', false)"
    />
    <VBtn aria-label="Close search" icon="mdi-close" @click="emit('close')" />
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import type { VTextField } from 'vuetify/components';

import type { FindResult } from '../../lib/pdfViewer';

const props = defineProps<{ result: FindResult | null }>();
const emit = defineEmits<{
  search: [query: string];
  // `previous` is true when searching backwards
  next: [previous: boolean];
  close: [];
}>();

const query = defineModel<string>({ required: true });
const input = useTemplateRef<InstanceType<typeof VTextField>>('input');

// While searching, pdf.js reports the previous counts, or none yet on the
// first search; only say "No matches" once it has actually found none
const status = computed(() => {
  if (!query.value || !props.result) return '';
  const { status, current, total } = props.result;
  if (!total) return status === 'not-found' ? 'No matches' : '';
  return `${current} / ${total}`;
});

// The model only reflects the new value once the parent re-renders, so
// search with the incoming value
const onInput = (value: string) => {
  query.value = value;
  emit('search', value);
};

// Selects the current query so typing replaces it
const focus = () => {
  input.value?.focus();
  input.value?.$el.querySelector('input')?.select();
};

defineExpose({ focus });
</script>

<style scoped>
/* 32px tall, matching the toolbar buttons (compact density is 40px) */
.tce-pdf-search :deep(.v-field) {
  --v-input-control-height: 32px;
  --v-field-padding-top: 0px;
  --v-field-padding-bottom: 0px;
  --v-field-input-padding-top: 0px;
  --v-field-input-padding-bottom: 0px;
}

/* The surrounding pill is the visible input, including its focus state */
.tce-pdf-search :deep(.v-field__overlay) {
  display: none;
}
</style>
