import { expect, test as setup } from '@playwright/test';

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'williamvanloey@gmail.com',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'correct-horse-battery-staple',
};

setup('rejects a wrong password, then signs in', async ({ page }) => {
  await page.goto('/dashboard/projects');
  await expect(page).toHaveURL(/\/dashboard\/login\?next=%2Fdashboard%2Fprojects/);

  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Password').fill('definitely-not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Incorrect email or password')).toBeVisible();

  await page.getByLabel('Password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects$/);
  await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();

  // The session token lives in an httpOnly cookie: page scripts cannot read it.
  expect(await page.evaluate(() => document.cookie)).not.toContain('wvl_session');
  await page.context().storageState({ path: 'e2e/.auth/admin.json' });
});
