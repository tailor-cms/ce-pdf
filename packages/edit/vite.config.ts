import { defineConfig } from 'vite';
import { libInjectCss } from 'vite-plugin-lib-inject-css';
import vue from '@vitejs/plugin-vue';

import { resolve } from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), libInjectCss()],
  build: {
    // In order to avoid edit runtime issues
    // due to package missing (if dist is deleted for short time)
    emptyOutDir: false,
    minify: false,
    // Minifies CSS, including the pdf.js viewer CSS imported as a string
    // (`?inline`), and lowers modern syntax (e.g. nesting) to `cssTarget`
    cssMinify: 'lightningcss',
    cssCodeSplit: false,
    lib: {
      entry: resolve(import.meta.dirname, './src/index.ts'),
      fileName: 'index',
      formats: ['es'],
    },
    rolldownOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['vue'],
      output: {
        exports: 'named',
        // Keep pdf.js in lazy-loaded chunks (loaded via dynamic import)
        codeSplitting: true,
      },
    },
  },
  worker: {
    // The pdf.js worker is inlined as a string (`?worker&inline`) which
    // consumers can't minify, so minify it here
    rolldownOptions: {
      output: { minify: true },
    },
  },
});
