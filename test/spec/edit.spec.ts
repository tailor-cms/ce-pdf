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
  test('Shows placeholder', async ({ page }) => {
    const edit = new Edit(page);
    await expect(edit.placeholder).toBeVisible();
    await expect(edit.viewer).not.toBeVisible();
  });

  test('Can import PDF via URL', async ({ page }) => {
    const edit = new Edit(page);
    await edit.focus();
    await edit.fileInput.open();
    await edit.fileInput.importUrl(PDF_URL);
    await expect(edit.viewer).toBeVisible();
    await expect(edit.viewer).toHaveAttribute('src', PDF_URL);
  });

  test('Can upload PDF file', async ({ page }) => {
    const edit = new Edit(page);
    await edit.focus();
    await edit.fileInput.open();
    await edit.fileInput.upload(PDF);
    await expect(edit.viewer).toBeVisible();
    await expect(edit.fileInput.removeBtn).toBeVisible();
  });

  test('Rejects non-PDF file', async ({ page }) => {
    const edit = new Edit(page);
    await edit.focus();
    await edit.fileInput.open();
    await edit.fileInput.upload(DOCUMENT);
    await edit.fileInput.cancel();
    await expect(edit.placeholder).toBeVisible();
    await expect(edit.viewer).not.toBeVisible();
  });

  test('Returns to empty state after upload and delete', async ({ page }) => {
    const edit = new Edit(page);
    await edit.focus();
    await edit.fileInput.open();
    await edit.fileInput.upload(PDF);
    await expect(edit.viewer).toBeVisible();
    await edit.fileInput.remove();
    await expect(edit.viewer).not.toBeVisible();
    await expect(edit.placeholder).toBeVisible();
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
});

test.describe('Readonly mode', () => {
  test('Hides upload prompt when empty', async ({ page }) => {
    const edit = new Edit(page);
    await edit.setReadonly();
    await edit.focus();
    await expect(edit.placeholder).toBeVisible();
    await expect(
      edit.el.getByText('Use toolbar to upload the PDF'),
    ).not.toBeVisible();
  });

  test('Keeps viewer visible when set', async ({ page }) => {
    await elementClient.update(ELEMENT_ID, { url: PDF_URL, assets: {} });
    await page.reload({ waitUntil: 'networkidle' });
    const edit = new Edit(page);
    await edit.setReadonly();
    await expect(edit.viewer).toBeVisible();
  });
});
