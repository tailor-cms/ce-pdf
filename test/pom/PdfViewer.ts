import type { FrameLocator, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

// Shared pdf.js viewer, rendered by both the edit and display components
export class PdfViewer {
  readonly el: Locator;
  readonly frame: FrameLocator;
  readonly viewport: Locator;
  readonly pages: Locator;
  readonly errorMessage: Locator;
  readonly pageInput: Locator;
  readonly prevPageBtn: Locator;
  readonly nextPageBtn: Locator;
  readonly zoomInBtn: Locator;
  readonly zoomOutBtn: Locator;
  readonly zoomLevelBtn: Locator;
  readonly searchToggleBtn: Locator;
  readonly searchInput: Locator;
  readonly searchStatus: Locator;
  readonly prevMatchBtn: Locator;
  readonly nextMatchBtn: Locator;
  readonly downloadBtn: Locator;
  readonly openInNewTabBtn: Locator;
  readonly moreActionsBtn: Locator;

  constructor(frame: FrameLocator, el: Locator) {
    this.el = el;
    this.frame = frame;
    this.viewport = el.locator('.tce-pdf-container').locator('..');
    this.pages = el.locator('.pdfViewer .page');
    this.errorMessage = el.getByText('This PDF could not be displayed');
    this.pageInput = el.getByRole('textbox', { name: 'Page number' });
    this.prevPageBtn = el.getByRole('button', { name: 'Previous page' });
    this.nextPageBtn = el.getByRole('button', { name: 'Next page' });
    this.zoomInBtn = el.getByRole('button', { name: 'Zoom in' });
    this.zoomOutBtn = el.getByRole('button', { name: 'Zoom out' });
    this.zoomLevelBtn = el.getByRole('button', { name: /^Zoom level/ });
    this.searchToggleBtn = el.getByRole('button', {
      name: 'Search in document',
    });
    this.searchInput = el.getByRole('textbox', { name: 'Search in document' });
    this.searchStatus = el.locator('.tce-pdf-search [aria-live]');
    this.prevMatchBtn = el.getByRole('button', { name: 'Previous match' });
    this.nextMatchBtn = el.getByRole('button', { name: 'Next match' });
    this.downloadBtn = el.getByRole('button', { name: 'Download PDF' });
    this.openInNewTabBtn = el.getByRole('link', {
      name: 'Open PDF in new tab',
    });
    this.moreActionsBtn = el.getByRole('button', { name: 'More actions' });
  }

  // Menus are teleported out of the viewer; closed ones stay mounted
  menuItem(name: string) {
    return this.frame
      .locator('.v-overlay--active .v-list-item')
      .filter({ hasText: name });
  }

  async waitForDocument(pageCount: number) {
    await expect(this.pages).toHaveCount(pageCount);
    await expect(this.el).toContainText(new RegExp(`/\\s*${pageCount}`));
  }

  async getZoom() {
    return Number.parseInt(await this.zoomLevelBtn.innerText(), 10);
  }

  async setZoom(preset: string) {
    await this.zoomLevelBtn.click();
    await this.menuItem(preset).click();
  }

  async goToPage(pageNumber: number) {
    await this.pageInput.fill(String(pageNumber));
    await this.pageInput.press('Enter');
  }

  async search(query: string) {
    if (!(await this.searchInput.isVisible()))
      await this.searchToggleBtn.click();
    await this.searchInput.fill(query);
  }

  // Narrows the viewer below the compact toolbar breakpoint
  async setWidth(width: number) {
    await this.el.evaluate((node, value) => {
      (node as HTMLElement).style.width = `${value}px`;
    }, width);
  }
}
