import { test, expect, noHorizontalOverflow } from './fixtures.js';

test('TV labels, 70-inch drag blur, independent stretch and full-detail upload', async ({ page }) => {
  await page.goto('/');
  await page.locator('#tv-tab').click();
  await expect(page.locator('#tv-image-info')).toContainText('Included landscape: 1,280 × 720 px');
  for (const [size, cm, resolution] of [
    ['32', '71 × 40 cm', '1280 × 720 px (921,600 pixels)'],
    ['45', '100 × 56 cm', '1920 × 1080 px (2,073,600 pixels)'],
    ['70', '155 × 87 cm', '3840 × 2160 px (8,294,400 pixels)'],
  ]) {
    const caption = page.locator(`[data-tv-size="${size}"]`).locator('xpath=ancestor::figure/figcaption');
    await expect(caption.locator('.tv-inches')).toHaveText(`${size}″`);
    await expect(caption.locator('.tv-cm')).toHaveText(cm);
    await expect(caption.locator('.tv-resolution')).toHaveText(resolution);
    expect(await caption.locator('.tv-inches').evaluate(node => getComputedStyle(node).fontSize)).toBe('21px');
  }
  await expect(page.getByRole('button', { name: /look closer/i })).toHaveCount(0);
  await expect(page.getByText(/look closer/i).locator('button')).toHaveCount(0);
  const handle = page.locator('[data-tv-handle="70"]');
  await handle.scrollIntoViewIfNeeded();
  const dot = await handle.boundingBox();
  const screen = await page.locator('[data-tv-size="70"]').boundingBox();
  await page.mouse.move(dot.x + dot.width / 2, dot.y + dot.height / 2);
  await page.mouse.down();
  await page.mouse.move(screen.x + screen.width + 50, screen.y + screen.height - 1, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('[data-tv-stretch="70"]')).toHaveValue('100');
  await expect(page.locator('[data-tv-size="70"]')).toHaveCSS('filter', 'blur(2.25px)');
  await expect(page.locator('[data-tv-stretch="45"]')).toHaveValue('0');
  await noHorizontalOverflow(page);

  // Generate the file inside the page; no local fixture or external upload is needed.
  await page.locator('#tv-photo-input').evaluate(async input => {
    const canvas = document.createElement('canvas');
    canvas.width = 3840;
    canvas.height = 2160;
    const context = canvas.getContext('2d');
    context.fillStyle = '#123abc';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'full-detail.png', { type: 'image/png' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#tv-image-info')).toContainText('Source image: 3,840 × 2,160 px');
  await expect(page.locator('#tv-image-info')).toContainText('Automatic 4K or higher');
  await page.locator('[data-tv-stretch="70"]').fill('100');
  await expect(page.locator('[data-tv-size="70"]')).toHaveCSS('filter', 'none');
  await expect(page.locator('#tv-photo-error')).toBeEmpty();
});
