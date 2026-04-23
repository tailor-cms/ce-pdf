import type { Locator, Page } from '@playwright/test';
import { pom } from '@tailor-cms/cek-e2e';

export class Display extends pom.DisplayPanel {
  readonly root: Locator;
  readonly viewer: Locator;

  constructor(page: Page) {
    super(page);
    this.root = this.editor.locator('.tce-pdf-root');
    this.viewer = this.editor.locator('iframe[title="PDF Viewer"]');
  }
}
