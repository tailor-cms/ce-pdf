import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PDF = path.join(__dirname, 'test.pdf');
export const DOCUMENT = path.join(__dirname, 'test-document.txt');
