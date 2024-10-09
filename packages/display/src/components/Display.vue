<template>
  <div v-if="data.url" class="tce-root">
    <iframe
      :src="data.url"
      class="w-100"
      height="360"
      title="PDF Viewer"
      @load="submit"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { ElementData } from '@tailor-cms/ce-pdf-manifest';

const props = defineProps<{ id: number; data: ElementData; userState: any }>();
const emit = defineEmits(['interaction']);

const submit = () => emit('interaction', { id: props.id });
</script>

<style scoped>
.tce-root {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 1rem;
}
</style>
