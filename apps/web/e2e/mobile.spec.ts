import { expect, test } from '@playwright/test';

test('mobile navigation opens, links work and nothing scrolls sideways', async ({ page }) => {
  await page.goto('/en');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page.getByRole('button', { name: 'Menu' }).click();
  const nav = page.locator('#mobile-nav');
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(nav).toBeHidden();
});
