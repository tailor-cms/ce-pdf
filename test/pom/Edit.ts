import type { FrameLocator, Locator, Page } from '@playwright/test';
import { pom } from '@tailor-cms/cek-e2e';

export class Edit extends pom.EditPanel {
  readonly placeholder: Locator;
  readonly viewer: Locator;
  readonly viewerFrame: FrameLocator;
  readonly fileInput: pom.FileInput;

  constructor(page: Page) {
    super(page);
    this.placeholder = this.editor.getByText('PDF component');
    this.viewer = this.editor.locator('iframe[title="PDF Viewer"]');
    this.viewerFrame = this.editor.frameLocator('iframe[title="PDF Viewer"]');
    this.fileInput = new pom.FileInput(this.el);
  }

  async focus() {
    await this.editor.click({ position: { x: 0, y: 0 } });
  }
}
