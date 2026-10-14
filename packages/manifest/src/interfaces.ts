import type * as common from '@tailor-cms/cek-common';

export interface ElementData extends common.ElementConfig {
  url: string | null;
  assets: { url?: string };
  // Allow end users to download the PDF (defaults to true)
  allowDownload?: boolean;
  // Viewer height in px; null/undefined = responsive (auto) height
  height?: number | null;
}

export type DataInitializer = common.DataInitializer<ElementData>;
export type Element = common.Element<ElementData>;
export type ElementManifest = common.ElementManifest<ElementData>;
