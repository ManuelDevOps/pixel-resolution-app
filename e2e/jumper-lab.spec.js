import { test, expect, noHorizontalOverflow } from './fixtures.js';

test('motifs, stable stitch counts, sideways scrolling and reset', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  await page.locator('#jumper-tab').click();
  await expect(page.locator('#jumper-motif option')).toHaveText([
    'Heart', 'Star', 'Space invader', 'Sunset landscape', 'Parrot',
  ]);
  await expect(page.locator('#jumper-count')).toHaveText('Stitches in the picture: 32 × 32 = 1,024 (unchanged)');
  const initialWidth = await page.locator('#jumper-canvas').evaluate(node => node.getBoundingClientRect().width);
  await page.locator('#jumper-motif').selectOption('landscape');
  await expect(page.locator('#jumper-count')).toHaveText('Stitches in the picture: 40 × 40 = 1,600 (unchanged)');
  await page.locator('#jumper-motif').selectOption('parrot');
  await expect(page.locator('#jumper-count')).toHaveText('Stitches in the picture: 40 × 40 = 1,600 (unchanged)');
  await page.locator('#jumper-x').fill('400');
  await expect(page.locator('#jumper-size')).toHaveText('Each stitch is now 4.0× wider and 1.0× taller');
  const sizes = await page.evaluate(() => ({
    canvas: document.querySelector('#jumper-canvas').getBoundingClientRect().width,
    frame: document.querySelector('.jumper-frame').clientWidth,
    scroll: document.querySelector('.jumper-frame').scrollLeft,
  }));
  expect(sizes.canvas).toBeGreaterThan(sizes.frame);
  expect(sizes.canvas).toBeGreaterThan(initialWidth * 2);
  expect(sizes.scroll).toBeGreaterThan(0);
  await noHorizontalOverflow(page);
  await page.locator('#jumper-reset').click();
  await expect(page.locator('#jumper-x')).toHaveValue('100');
  await expect(page.locator('#jumper-y')).toHaveValue('100');
  await expect(page.locator('#jumper-size')).toHaveText('Each stitch is now 1.0× wider and 1.0× taller');
  expect(await page.locator('#jumper-canvas').evaluate(node => node.getBoundingClientRect().width)).toBeCloseTo(initialWidth, 0);
});
