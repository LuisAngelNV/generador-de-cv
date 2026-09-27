import type { Browser, Page } from 'puppeteer';
import { env } from '../config/env';

const RENDER_TIMEOUT_MS = 20_000;

const LAUNCH_ARGS = [
  // Containers usually have a tiny /dev/shm; Chromium uses /tmp instead.
  '--disable-dev-shm-usage',
  ...(env.PDF_DISABLE_SANDBOX ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
];

let browserPromise: Promise<Browser> | null = null;

/**
 * A single browser is shared by every render; it is relaunched if it crashes.
 * Puppeteer is ESM-only, so it is loaded with a dynamic import (also delays it to the first PDF).
 */
function getBrowser(): Promise<Browser> {
  browserPromise ??= import('puppeteer')
    .then(({ default: puppeteer }) => puppeteer.launch({ headless: true, args: LAUNCH_ARGS }))
    .then((browser) => {
      browser.on('disconnected', () => {
        browserPromise = null;
      });
      return browser;
    })
    .catch((error: unknown) => {
      browserPromise = null;
      throw error;
    });
  return browserPromise;
}

let activeRenders = 0;
const waiting: (() => void)[] = [];

/** Limits concurrent renders; a render waits for a free slot instead of opening more pages. */
async function acquireSlot(): Promise<void> {
  if (activeRenders < env.PDF_MAX_CONCURRENT) {
    activeRenders++;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
}

function releaseSlot(): void {
  const next = waiting.shift();
  if (next) {
    next(); // The slot passes straight to the next render.
  } else {
    activeRenders--;
  }
}

/** Only inline content (data: URLs) may load: the document can never reach the network. */
async function isolatePage(page: Page): Promise<void> {
  await page.setJavaScriptEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('data:') || url === 'about:blank') {
      void request.continue();
    } else {
      void request.abort('blockedbyclient');
    }
  });
}

/** Prints a standalone HTML document to an A4 PDF. */
export async function renderPdf(html: string): Promise<Buffer> {
  await acquireSlot();
  let page: Page | undefined;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);
    await isolatePage(page);
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      timeout: RENDER_TIMEOUT_MS,
    });
    return Buffer.from(pdf);
  } finally {
    await page?.close().catch(() => undefined);
    releaseSlot();
  }
}

export async function closePdfRenderer(): Promise<void> {
  const browser = await browserPromise?.catch(() => null);
  browserPromise = null;
  await browser?.close();
}
