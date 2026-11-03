import { test as base, expect } from '@playwright/test';

// Attach before navigation, so startup exceptions and failed async work are included.
export const test = base.extend({
  consoleErrors: [async ({ page }, use) => {
    const errors = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    await use(errors);
    expect(errors, 'browser console and page errors').toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function noHorizontalOverflow(page) {
  const size = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(size.document).toBeLessThanOrEqual(size.viewport);
  expect(size.body).toBeLessThanOrEqual(size.viewport);
}
