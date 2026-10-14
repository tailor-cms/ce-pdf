<template>
  <div class="d-flex align-center ga-1">
    <VBtn
      :active="isSearchOpen"
      :aria-expanded="isSearchOpen"
      :disabled="disabled"
      aria-label="Search in document"
      icon="mdi-magnify"
      @click="emit('toggle-search')"
    />
    <VBtn
      v-if="isFullscreenSupported && !compact"
      :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
      :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
      @click="emit('toggle-fullscreen')"
    />
    <template v-if="!compact">
      <VBtn
        v-if="allowDownload"
        aria-label="Download PDF"
        icon="mdi-download"
        @click="emit('download')"
      />
      <VBtn
        :href="url"
        aria-label="Open PDF in new tab"
        icon="mdi-open-in-new"
        rel="noopener noreferrer"
        target="_blank"
      />
    </template>
    <!-- Narrow viewers move secondary actions into an overflow menu -->
    <VMenu v-else :attach="attach" location="bottom end">
      <template #activator="{ props: menuProps }">
        <VBtn
          v-bind="menuProps"
          aria-label="More actions"
          icon="mdi-dots-vertical"
        />
      </template>
      <VList density="compact">
        <VListItem
          v-if="isFullscreenSupported"
          :prepend-icon="
            isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'
          "
          :title="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          @click="emit('toggle-fullscreen')"
        />
        <VListItem
          v-if="allowDownload"
          prepend-icon="mdi-download"
          title="Download PDF"
          @click="emit('download')"
        />
        <VListItem
          :href="url"
          prepend-icon="mdi-open-in-new"
          rel="noopener noreferrer"
          target="_blank"
          title="Open PDF in new tab"
        />
      </VList>
    </VMenu>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  url: string;
  allowDownload: boolean;
  disabled: boolean;
  compact: boolean;
  isSearchOpen: boolean;
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  // Menu attach target, needed while the viewer is fullscreen
  attach?: HTMLElement;
}>();
const emit = defineEmits<{
  'toggle-search': [];
  'toggle-fullscreen': [];
  download: [];
}>();
</script>
