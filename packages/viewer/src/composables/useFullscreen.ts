import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { Ref } from 'vue';

export interface Fullscreen {
  isFullscreen: Ref<boolean>;
  isSupported: Ref<boolean>;
  toggle: () => Promise<void>;
}

export const useFullscreen = (
  target: Readonly<Ref<HTMLElement | null>>,
): Fullscreen => {
  const isFullscreen = ref(false);
  const isSupported = ref(false);

  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await target.value?.requestFullscreen();
    } catch {
      // Fullscreen request denied (e.g. not triggered by user gesture)
    }
  };

  const onChange = () => {
    isFullscreen.value =
      !!target.value && document.fullscreenElement === target.value;
  };

  onMounted(() => {
    isSupported.value = !!document.fullscreenEnabled;
    document.addEventListener('fullscreenchange', onChange);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', onChange);
    if (document.fullscreenElement === target.value) {
      document.exitFullscreen().catch(() => {});
    }
  });

  return { isFullscreen, isSupported, toggle };
};
