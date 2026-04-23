import { expect, test } from '@playwright/test';
import { elementClient } from '@tailor-cms/cek-e2e';

import { Display } from '../pom';

const ELEMENT_ID = 'test-pdf-display';
const PDF_URL = 'https://example.com/test.pdf';

test.beforeEach(async ({ page }) => {
  await elementClient.reset(ELEMENT_ID);
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

  test('Renders iframe with src', async ({ page }) => {
    const display = new Display(page);
    await expect(display.viewer).toBeVisible();
    await expect(display.viewer).toHaveAttribute('src', PDF_URL);
  });
});

test.afterAll(async () => {
  await elementClient.reset(ELEMENT_ID);
});
