<template>
  <div class="d-flex align-center">
    <VBtn
      v-if="!compact"
      :disabled="disabled"
      aria-label="Zoom out"
      icon="mdi-minus"
      @click="emit('zoom-out')"
    />
    <VMenu :attach="attach" location="bottom">
      <template #activator="{ props: menuProps }">
        <VBtn
          v-bind="menuProps"
          :aria-label="`Zoom level ${label}`"
          :disabled="disabled"
          class="tce-pdf-zoom-btn text-body-medium text-none px-1"
          height="30"
          min-width="50"
          rounded="lg"
          size="default"
          variant="text"
        >
          {{ label }}
        </VBtn>
      </template>
      <VList density="compact" min-width="140">
        <VListItem
          v-for="preset in ZOOM_PRESETS"
          :key="preset.label"
          :active="isActive(preset)"
          :title="preset.label"
          color="primary"
          @click="emit('zoom', preset.value)"
        />
      </VList>
    </VMenu>
    <VBtn
      v-if="!compact"
      :disabled="disabled"
      aria-label="Zoom in"
      icon="mdi-plus"
      @click="emit('zoom-in')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { ZoomValue } from '../../lib/pdfViewer';

interface ZoomPreset {
  label: string;
  value: ZoomValue;
}

const ZOOM_PRESETS: ZoomPreset[] = [
  { label: 'Fit width', value: 'page-width' },
  { label: 'Fit page', value: 'page-fit' },
  ...[50, 75, 100, 125, 150, 200].map((it) => ({
    label: `${it}%`,
    value: it / 100,
  })),
];

const props = defineProps<{
  scale: number;
  // pdf.js preset (e.g. fit width) the scale was derived from, if any
  scalePreset?: string;
  disabled: boolean;
  // Narrow viewers keep only the zoom level menu
  compact?: boolean;
  // Menu attach target, needed while the viewer is fullscreen
  attach?: HTMLElement;
}>();
const emit = defineEmits<{
  'zoom-in': [];
  'zoom-out': [];
  zoom: [value: ZoomValue];
}>();

const label = computed(() =>
  props.disabled ? '–' : `${Math.round(props.scale * 100)}%`,
);

const isActive = ({ value }: ZoomPreset) => {
  if (typeof value === 'string') return props.scalePreset === value;
  return !props.scalePreset && Math.abs(props.scale - value) < 0.001;
};
</script>

<style scoped>
.tce-pdf-zoom-btn {
  font-variant-numeric: tabular-nums;
  letter-spacing: normal;
}
</style>
