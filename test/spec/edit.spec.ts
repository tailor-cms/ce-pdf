import { expect, test } from '@playwright/test';
import { elementClient } from '@tailor-cms/cek-e2e';

import { DOCUMENT, PDF } from '../fixtures';
import { Edit } from '../pom';

const ELEMENT_ID = 'test-pdf-edit';
const PDF_URL = 'https://example.com/test.pdf';

test.beforeEach(async ({ page }) => {
  await elementClient.reset(ELEMENT_ID);
  await page.goto(`/?id=${ELEMENT_ID}`);
  await page.waitForLoadState('networkidle');
});

test.describe('When PDF is not set', () => {
  test('Shows dropzone as empty state', async ({ page }) => {
    const edit = new Edit(page);
    await expect(edit.fileInput.dropzone).toBeVisible();
    await expect(edit.placeholder).not.toBeVisible();
    await expect(edit.viewer).not.toBeVisible();
  });

  test('Can import PDF via URL', async ({ page }) => {
    const edit = new Edit(page);
    await edit.focus();
    await edit.fileInput.openUrlFromDropzone();
    await edit.fileInput.importUrl(PDF_URL);
    await expect(edit.viewer).toBeVisible();
    await expect(edit.viewer).toHaveAttribute('src', PDF_URL);
  });

  test('Can upload PDF file via dropzone', async ({ page }) => {
    const edit = new Edit(page);
    await edit.focus();
    await edit.fileInput.dropzoneUpload(PDF);
    await expect(edit.viewer).toBeVisible();
    await expect(edit.fileInput.dropzone).not.toBeVisible();
    await edit.fileInput.expectFile('test.pdf');
  });

  test('Rejects non-PDF file', async ({ page }) => {
    const edit = new Edit(page);
    await edit.focus();
    await edit.fileInput.dropzoneUpload(DOCUMENT);
    await expect(edit.fileInput.dropzone).toBeVisible();
    await expect(edit.viewer).not.toBeVisible();
  });
});

test.describe('When PDF is set', () => {
  test.beforeEach(async ({ page }) => {
    await elementClient.update(ELEMENT_ID, { url: PDF_URL, assets: {} });
    await page.reload({ waitUntil: 'networkidle' });
  });

  test('Shows viewer with src', async ({ page }) => {
    const edit = new Edit(page);
    await expect(edit.viewer).toBeVisible();
    await expect(edit.viewer).toHaveAttribute('src', PDF_URL);
  });

  test('Can remove PDF', async ({ page }) => {
    const edit = new Edit(page);
    await edit.focus();
    await edit.fileInput.removeFromRow();
    await expect(edit.viewer).not.toBeVisible();
    await expect(edit.fileInput.dropzone).toBeVisible();
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
    await expect(edit.viewer).toBeVisible();
    await expect(edit.fileInput.replaceBtn).not.toBeVisible();
  });
});
