import { expect, test } from '@playwright/test';
import { elementClient } from '@tailor-cms/cek-e2e';

import { failPdf, servePdf } from '../fixtures';
import { Display } from '../pom';

const ELEMENT_ID = 'test-pdf-display';
const PDF_URL = 'https://example.com/sample.pdf';
const BROKEN_PDF_URL = 'https://example.com/missing.pdf';

test.beforeEach(async ({ page }) => {
  await servePdf(page, PDF_URL);
  await failPdf(page, BROKEN_PDF_URL);
  await elementClient.reset(ELEMENT_ID);
  await elementClient.resetState(ELEMENT_ID);
  await page.goto(`/?id=${ELEMENT_ID}`);
  await page.waitForLoadState('networkidle');
});

test.describe('Empty state', () => {
  test('Renders placeholder when content is empty', async ({ page }) => {
    const display = new Display(page);
    await expect(display.placeholder).toBeVisible();
    await expect(display.root).not.toBeVisible();
  });
});

test.describe('Content rendering', () => {
  test.beforeEach(async ({ page }) => {
    await elementClient.update(ELEMENT_ID, { url: PDF_URL, assets: {} });
    await page.reload({ waitUntil: 'networkidle' });
  });

  test('Renders the PDF pages', async ({ page }) => {
    const { viewer } = new Display(page);
    await viewer.waitForDocument(5);
    await expect(viewer.openInNewTabBtn).toHaveAttribute('href', PDF_URL);
    await expect(viewer.downloadBtn).toBeVisible();
  });

  test('Hides download button when download is disabled', async ({ page }) => {
    await elementClient.update(ELEMENT_ID, {
      url: PDF_URL,
      assets: {},
      allowDownload: false,
    });
    await page.reload({ waitUntil: 'networkidle' });
    const { viewer } = new Display(page);
    await viewer.waitForDocument(5);
    await expect(viewer.downloadBtn).not.toBeVisible();
  });

  test('Uses the configured height', async ({ page }) => {
    await elementClient.update(ELEMENT_ID, {
      url: PDF_URL,
      assets: {},
      height: 320,
    });
    await page.reload({ waitUntil: 'networkidle' });
    const { viewer } = new Display(page);
    await expect(viewer.viewport).toHaveCSS('height', '320px');
  });
});

test.describe('Load error', () => {
  test('Shows fallback linking to the PDF', async ({ page }) => {
    await elementClient.update(ELEMENT_ID, {
      url: BROKEN_PDF_URL,
      assets: {},
    });
    await page.reload({ waitUntil: 'networkidle' });
    const { viewer } = new Display(page);
    await expect(viewer.errorMessage).toBeVisible();
    const openLink = viewer.el.getByRole('link', {
      name: 'Open PDF',
      exact: true,
    });
    await expect(openLink).toHaveAttribute('href', BROKEN_PDF_URL);
  });
});
