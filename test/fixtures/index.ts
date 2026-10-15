import type { Page } from '@playwright/test';

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PDF = path.join(__dirname, 'test.pdf');
// 5 pages; "needle" appears on pages 2 and 4
export const SAMPLE_PDF = path.join(__dirname, 'sample.pdf');
export const DOCUMENT = path.join(__dirname, 'test-document.txt');

// Serves a fixture PDF at a cross-origin URL, like a file hosted on a CDN
export const servePdf = (page: Page, url: string, file = SAMPLE_PDF) =>
  page.route(url, (route) =>
    route.fulfill({
      path: file,
      contentType: 'application/pdf',
      headers: { 'access-control-allow-origin': '*' },
    }),
  );

export const failPdf = (page: Page, url: string) =>
  page.route(url, (route) => route.fulfill({ status: 404 }));
