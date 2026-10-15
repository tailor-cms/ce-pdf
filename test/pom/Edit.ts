import type { Locator, Page } from '@playwright/test';
import { pom } from '@tailor-cms/cek-e2e';

import { PdfViewer } from './PdfViewer';

export class Edit extends pom.EditPanel {
  readonly placeholder: Locator;
  readonly viewer: PdfViewer;
  readonly fileInput: pom.FileInput;
  readonly allowDownloadSwitch: Locator;
  readonly heightInput: Locator;

  constructor(page: Page) {
    super(page);
    this.placeholder = this.editor.getByText('PDF component');
    this.viewer = new PdfViewer(
      this.el,
      this.editor.locator('.tce-pdf-viewer'),
    );
    this.fileInput = new pom.FileInput(this.el);
    this.allowDownloadSwitch = this.sideToolbar.getByLabel('Allow download');
    this.heightInput = this.sideToolbar.getByLabel('Viewer height');
  }

  // Clicks the label, the switch thumb covers its input
  async toggleAllowDownload() {
    await this.sideToolbar.getByText('Allow download').click();
  }

  async setHeight(height: number | string) {
    await this.heightInput.fill(String(height));
    await this.heightInput.press('Enter');
  }
}
