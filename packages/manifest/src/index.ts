import type {
  DataInitializer,
  ElementData,
  ElementManifest,
} from './interfaces';

// Element unique id within the target system (e.g. Tailor)
export const type = 'PDF';

// Display name (e.g. shown to the author)
export const name = 'PDF';

// Function which inits element state (data property on the Content Element
// entity)
export const initState: DataInitializer = (): ElementData => ({
  url: null,
  assets: {},
});

// Can be loaded from package.json
export const version = '1.0';

// UI configuration for Tailor CMS
const ui = {
  // Display icon, https://pictogrammers.com/library/mdi/
  icon: 'mdi-file-pdf-box',
  // Does element support only full width or can be used within layouts
  // (e.g. 50/50 layout)
  forceFullWidth: true,
};

const manifest: ElementManifest = {
  type,
  version: '1.0',
  name,
  ssr: false,
  initState,
  ui,
};

export default manifest;
export * from './interfaces';
