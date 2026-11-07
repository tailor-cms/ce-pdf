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
    <VMenu v-else location="top end" offset="16">
      <template #activator="{ props: menuProps }">
        <VBtn
          v-bind="menuProps"
          aria-label="More actions"
          icon="mdi-dots-vertical"
        />
      </template>
      <VList density="compact">
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
}>();
const emit = defineEmits<{
  'toggle-search': [];
  download: [];
}>();
</script>
