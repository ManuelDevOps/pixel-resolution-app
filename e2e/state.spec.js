import { test, expect } from './fixtures.js';

test('settings survive page switches and theme changes; Cyber applies before first reload frame', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#source-size')).toContainText('Included landscape: 1280 × 720 px');
  await page.locator('#resolution').fill('2');
  const selectedResolution = await page.locator('#preview-size').textContent();
  await page.locator('#tv-tab').click();
  await expect(page.locator('#tv-image-info')).toContainText('Included landscape: 1,280 × 720 px');
  await page.locator('[data-tv-stretch="70"]').fill('65');
  await page.locator('#jumper-tab').click();
  await page.locator('#jumper-motif').selectOption('parrot');
  await page.locator('#jumper-x').fill('300');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'cyber');
  await page.locator('#explore-tab').click();
  await expect(page.locator('#preview-size')).toHaveText(selectedResolution);
  await expect(page.locator('#resolution')).toHaveValue('2');
  await page.locator('#tv-tab').click();
  await expect(page.locator('[data-tv-stretch="70"]')).toHaveValue('65');
  await page.locator('#jumper-tab').click();
  await expect(page.locator('#jumper-motif')).toHaveValue('parrot');
  await expect(page.locator('#jumper-x')).toHaveValue('300');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'cyber');
  await expect(page.locator('#jumper-x')).toHaveValue('300');
  await page.locator('#theme-toggle').click();

  // Init scripts run before the inline theme boot script; sample every paint after it.
  await page.addInitScript(() => {
    window.__themeFrames = [];
    const record = () => {
      window.__themeFrames.push(document.documentElement.dataset.theme || 'standard');
      if (window.__themeFrames.length < 5) requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  await page.reload();
  await page.waitForFunction(() => window.__themeFrames.length >= 2);
  expect(await page.evaluate(() => window.__themeFrames)).toEqual(expect.arrayContaining(['cyber']));
  expect((await page.evaluate(() => window.__themeFrames)).every(theme => theme === 'cyber')).toBe(true);
  await expect(page.locator('#theme-toggle')).toHaveText('Standard theme');
});
