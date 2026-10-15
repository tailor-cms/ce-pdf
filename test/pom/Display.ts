import type { Locator, Page } from '@playwright/test';
import { pom } from '@tailor-cms/cek-e2e';

import { PdfViewer } from './PdfViewer';

export class Display extends pom.DisplayPanel {
  readonly root: Locator;
  readonly viewer: PdfViewer;

  constructor(page: Page) {
    super(page);
    this.root = this.editor.locator('.tce-pdf-root');
    this.viewer = new PdfViewer(this.el, this.root.locator('.tce-pdf-viewer'));
  }
}
