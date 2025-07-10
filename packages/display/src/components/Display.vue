<template>
  <div v-if="element.data.url" class="tce-pdf-root">
    <iframe
      :src="element.data.url"
      class="w-100"
      height="360"
      title="PDF Viewer"
      @load="submit"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { Element } from '@tailor-cms/ce-pdf-manifest';

const props = defineProps<{ element: Element; userState: any }>();
const emit = defineEmits(['interaction']);

const submit = () => emit('interaction', { id: props.element.id });
</script>

<style scoped>
.tce-pdf-root {
}
</style>
