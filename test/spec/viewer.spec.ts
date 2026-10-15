import { expect, test } from '@playwright/test';
import { elementClient } from '@tailor-cms/cek-e2e';

import { Display } from '../pom';
import { servePdf } from '../fixtures';

// The viewer is shared by edit and display; tested through display
const ELEMENT_ID = 'test-pdf-viewer';
const PDF_URL = 'https://example.com/sample.pdf';
const PAGE_COUNT = 5;

// Wide enough for the full toolbar
test.use({ viewport: { width: 1600, height: 1000 } });

test.beforeEach(async ({ page }) => {
  await servePdf(page, PDF_URL);
  await elementClient.reset(ELEMENT_ID);
  await elementClient.resetState(ELEMENT_ID);
  await elementClient.update(ELEMENT_ID, { url: PDF_URL, assets: {} });
  await page.goto(`/?id=${ELEMENT_ID}`);
  await new Display(page).viewer.waitForDocument(PAGE_COUNT);
});

test.describe('Page navigation', () => {
  test('Opens on the first page', async ({ page }) => {
    const { viewer } = new Display(page);
    await expect(viewer.pageInput).toHaveValue('1');
    await expect(viewer.prevPageBtn).toBeDisabled();
  });

  test('Can step through pages', async ({ page }) => {
    const { viewer } = new Display(page);
    await viewer.nextPageBtn.click();
    await expect(viewer.pageInput).toHaveValue('2');
    await viewer.prevPageBtn.click();
    await expect(viewer.pageInput).toHaveValue('1');
  });

  test('Can jump to a page', async ({ page }) => {
    const { viewer } = new Display(page);
    await viewer.goToPage(4);
    await expect(viewer.pageInput).toHaveValue('4');
  });

  test('Ignores out of range pages', async ({ page }) => {
    const { viewer } = new Display(page);
    await viewer.goToPage(3);
    await expect(viewer.pageInput).toHaveValue('3');
    await viewer.goToPage(PAGE_COUNT + 1);
    await expect(viewer.pageInput).toHaveValue('3');
    await viewer.goToPage(0);
    await expect(viewer.pageInput).toHaveValue('3');
  });
});

test.describe('Zoom', () => {
  test('Can zoom in and out', async ({ page }) => {
    const { viewer } = new Display(page);
    const initial = await viewer.getZoom();
    await viewer.zoomInBtn.click();
    await expect.poll(() => viewer.getZoom()).toBeGreaterThan(initial);
    const zoomedIn = await viewer.getZoom();
    await viewer.zoomOutBtn.click();
    await expect.poll(() => viewer.getZoom()).toBeLessThan(zoomedIn);
  });

  test('Can pick a zoom level', async ({ page }) => {
    const { viewer } = new Display(page);
    const fitWidth = await viewer.getZoom();
    await viewer.setZoom('100%');
    await expect(viewer.zoomLevelBtn).toHaveText('100%');
    await viewer.setZoom('Fit width');
    await expect.poll(() => viewer.getZoom()).toBe(fitWidth);
  });

  test('Marks the active zoom preset', async ({ page }) => {
    const { viewer } = new Display(page);
    await viewer.setZoom('Fit page');
    await viewer.zoomLevelBtn.click();
    await expect(viewer.menuItem('Fit page')).toHaveClass(/--active/);
    await expect(viewer.menuItem('Fit width')).not.toHaveClass(/--active/);
  });
});

test.describe('Keyboard shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await new Display(page).viewer.pages.first().click();
  });

  test('Zooms with Ctrl + plus, minus and zero', async ({ page }) => {
    const { viewer } = new Display(page);
    const fitWidth = await viewer.getZoom();
    await page.keyboard.press('Control+=');
    await expect.poll(() => viewer.getZoom()).toBeGreaterThan(fitWidth);
    const zoomedIn = await viewer.getZoom();
    await page.keyboard.press('Control+-');
    await expect.poll(() => viewer.getZoom()).toBeLessThan(zoomedIn);
    await page.keyboard.press('Control+0');
    await expect.poll(() => viewer.getZoom()).toBe(fitWidth);
  });

  test('Opens search with Ctrl + F', async ({ page }) => {
    const { viewer } = new Display(page);
    await page.keyboard.press('Control+f');
    await expect(viewer.searchInput).toBeFocused();
  });
});

test.describe('Search', () => {
  test('Shows the match count', async ({ page }) => {
    const { viewer } = new Display(page);
    await viewer.search('needle');
    await expect(viewer.searchStatus).toHaveText('1 / 2');
  });

  test('Can step through matches', async ({ page }) => {
    const { viewer } = new Display(page);
    await viewer.search('needle');
    await expect(viewer.searchStatus).toHaveText('1 / 2');
    await viewer.searchInput.press('Enter');
    await expect(viewer.searchStatus).toHaveText('2 / 2');
    await viewer.searchInput.press('Shift+Enter');
    await expect(viewer.searchStatus).toHaveText('1 / 2');
    await viewer.nextMatchBtn.click();
    await expect(viewer.searchStatus).toHaveText('2 / 2');
    await viewer.prevMatchBtn.click();
    await expect(viewer.searchStatus).toHaveText('1 / 2');
  });

  test('Reports when nothing is found', async ({ page }) => {
    const { viewer } = new Display(page);
    await viewer.search('missing');
    await expect(viewer.searchStatus).toHaveText('No matches');
  });

  test('Closes search with Escape', async ({ page }) => {
    const { viewer } = new Display(page);
    await viewer.search('needle');
    await viewer.searchInput.press('Escape');
    await expect(viewer.searchInput).toBeHidden();
    await expect(viewer.el.locator('.textLayer .highlight')).toHaveCount(0);
  });
});

test.describe('Document actions', () => {
  test('Downloads the PDF', async ({ page }) => {
    const { viewer } = new Display(page);
    const download = page.waitForEvent('download');
    await viewer.downloadBtn.click();
    expect((await download).suggestedFilename()).toBe('sample.pdf');
  });

  test('Links to the PDF', async ({ page }) => {
    const { viewer } = new Display(page);
    await expect(viewer.openInNewTabBtn).toHaveAttribute('href', PDF_URL);
  });
});

test.describe('Narrow viewer', () => {
  test.beforeEach(async ({ page }) => {
    await new Display(page).viewer.setWidth(400);
  });

  test('Keeps only essential toolbar controls', async ({ page }) => {
    const { viewer } = new Display(page);
    await expect(viewer.moreActionsBtn).toBeVisible();
    await expect(viewer.prevPageBtn).toBeHidden();
    await expect(viewer.zoomInBtn).toBeHidden();
    await expect(viewer.downloadBtn).toBeHidden();
    await expect(viewer.pageInput).toBeVisible();
    await expect(viewer.zoomLevelBtn).toBeVisible();
  });

  test('Moves secondary actions to the overflow menu', async ({ page }) => {
    const { viewer } = new Display(page);
    await viewer.moreActionsBtn.click();
    await expect(viewer.menuItem('Download PDF')).toBeVisible();
    await expect(viewer.menuItem('Open PDF in new tab')).toBeVisible();
  });
});
