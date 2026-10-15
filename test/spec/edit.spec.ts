import { expect, test } from '@playwright/test';
import { elementClient } from '@tailor-cms/cek-e2e';

import { DOCUMENT, PDF, servePdf } from '../fixtures';
import { Edit } from '../pom';

const ELEMENT_ID = 'test-pdf-edit';
const PDF_URL = 'https://example.com/sample.pdf';

test.beforeEach(async ({ page }) => {
  await servePdf(page, PDF_URL);
  await elementClient.reset(ELEMENT_ID);
  await page.goto(`/?id=${ELEMENT_ID}`);
  await page.waitForLoadState('networkidle');
});

test.describe('When PDF is not set', () => {
  test('Shows dropzone as empty state', async ({ page }) => {
    const edit = new Edit(page);
    await expect(edit.fileInput.dropzone).toBeVisible();
    await expect(edit.placeholder).not.toBeVisible();
    await expect(edit.viewer.el).not.toBeVisible();
  });

  test('Can import PDF via URL', async ({ page }) => {
    const edit = new Edit(page);
    await edit.focus();
    await edit.fileInput.openUrlFromDropzone();
    await edit.fileInput.importUrl(PDF_URL);
    await edit.viewer.waitForDocument(5);
    await expect(edit.viewer.openInNewTabBtn).toHaveAttribute('href', PDF_URL);
  });

  test('Can upload PDF file via dropzone', async ({ page }) => {
    const edit = new Edit(page);
    await edit.focus();
    await edit.fileInput.dropzoneUpload(PDF);
    await expect(edit.viewer.el).toBeVisible();
    await expect(edit.fileInput.dropzone).not.toBeVisible();
    await edit.fileInput.expectFile('test.pdf');
  });

  test('Rejects non-PDF file', async ({ page }) => {
    const edit = new Edit(page);
    await edit.focus();
    await edit.fileInput.dropzoneUpload(DOCUMENT);
    await expect(edit.fileInput.dropzone).toBeVisible();
    await expect(edit.viewer.el).not.toBeVisible();
  });
});

test.describe('When PDF is set', () => {
  test.beforeEach(async ({ page }) => {
    await elementClient.update(ELEMENT_ID, { url: PDF_URL, assets: {} });
    await page.reload({ waitUntil: 'networkidle' });
  });

  test('Shows viewer linking to the PDF', async ({ page }) => {
    const edit = new Edit(page);
    await edit.viewer.waitForDocument(5);
    await expect(edit.viewer.openInNewTabBtn).toHaveAttribute('href', PDF_URL);
  });

  test('Can remove PDF', async ({ page }) => {
    const edit = new Edit(page);
    await edit.focus();
    await edit.fileInput.removeFromRow();
    await expect(edit.viewer.el).not.toBeVisible();
    await expect(edit.fileInput.dropzone).toBeVisible();
  });
});

test.describe('Side toolbar', () => {
  // Wide enough for the full viewer toolbar
  test.use({ viewport: { width: 1600, height: 1000 } });

  test.beforeEach(async ({ page }) => {
    await elementClient.update(ELEMENT_ID, { url: PDF_URL, assets: {} });
    await page.reload({ waitUntil: 'networkidle' });
    await new Edit(page).focus();
  });

  test('Can disable download', async ({ page }) => {
    const edit = new Edit(page);
    await expect(edit.allowDownloadSwitch).toBeChecked();
    await expect(edit.viewer.downloadBtn).toBeVisible();
    await edit.toggleAllowDownload();
    await expect(edit.allowDownloadSwitch).not.toBeChecked();
    await expect(edit.viewer.downloadBtn).not.toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await edit.focus();
    await expect(edit.allowDownloadSwitch).not.toBeChecked();
  });

  test('Can set viewer height', async ({ page }) => {
    const edit = new Edit(page);
    await edit.setHeight(320);
    await expect(edit.viewer.viewport).toHaveCSS('height', '320px');
    await page.reload({ waitUntil: 'networkidle' });
    await edit.focus();
    await expect(edit.heightInput).toHaveValue('320');
    await expect(edit.viewer.viewport).toHaveCSS('height', '320px');
  });

  test('Rejects out of range height', async ({ page }) => {
    const edit = new Edit(page);
    await edit.heightInput.fill('50');
    await expect(
      edit.sideToolbar.getByText('Height must be at least 200px'),
    ).toBeVisible();
  });
});

test.describe('Readonly mode', () => {
  test('Shows placeholder instead of dropzone when empty', async ({ page }) => {
    const edit = new Edit(page);
    await edit.setReadonly();
    await expect(edit.placeholder).toBeVisible();
    await expect(edit.fileInput.dropzone).not.toBeVisible();
  });

  test('Keeps viewer visible and hides file actions when set', async ({
    page,
  }) => {
    await elementClient.update(ELEMENT_ID, { url: PDF_URL, assets: {} });
    await page.reload({ waitUntil: 'networkidle' });
    const edit = new Edit(page);
    await edit.setReadonly();
    await edit.focus();
    await expect(edit.viewer.el).toBeVisible();
    await expect(edit.fileInput.replaceBtn).not.toBeVisible();
  });
});
