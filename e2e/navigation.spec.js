import { test, expect, noHorizontalOverflow } from './fixtures.js';

for (const width of [320, 768, 1440]) {
  for (const theme of ['Standard', 'Cyber']) {
    test(`mode navigation and layout at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      if (theme === 'Cyber') await page.locator('#theme-toggle').click();
      expect(await page.locator('html').getAttribute('data-theme')).toBe(theme === 'Cyber' ? 'cyber' : null);
      expect(await page.locator('.mode-switch button').allTextContents()).toEqual(['Explore', 'TV Lab', 'Jumper Lab']);
      const positions = [];
      for (const [tab, section] of [['#explore-tab', '#explore'], ['#tv-tab', '#tv-lab'], ['#jumper-tab', '#jumper-lab']]) {
        await page.locator(tab).click();
        await expect(page.locator(section)).toBeVisible();
        const nav = await page.locator(`${section} .mode-switch`).boundingBox();
        const workspace = await page.locator(`${section} .workspace`).first().boundingBox();
        const heading = await page.locator(`${section} .section-heading h2`).boundingBox();
        expect(nav).not.toBeNull();
        expect(workspace).not.toBeNull();
        expect(heading).not.toBeNull();
        positions.push({ left: nav.x - workspace.x, top: nav.y - workspace.y });
        expect(nav.x + nav.width <= heading.x || heading.x + heading.width <= nav.x ||
          nav.y + nav.height <= heading.y || heading.y + heading.height <= nav.y,
        'navigation must not cover the heading').toBe(true);
        await noHorizontalOverflow(page);
      }
      for (const position of positions.slice(1)) {
        expect(Math.abs(position.left - positions[0].left)).toBeLessThanOrEqual(1);
        expect(Math.abs(position.top - positions[0].top)).toBeLessThanOrEqual(1);
      }
      await page.locator('#tv-tab').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#tv-tab')).toBeFocused();
      await expect(page.locator('#tv-lab')).toBeVisible();
    });
  }
}
