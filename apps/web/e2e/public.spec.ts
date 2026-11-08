import { expect, test } from '@playwright/test';

test('redirects / to a language and renders the profile', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('William');
});

test('switching language keeps the current page', async ({ page }) => {
  await page.goto('/en/work');
  await page.getByTestId('locale-switcher').click();
  await page.getByRole('button', { name: 'Português (Brasil)' }).click();
  await expect(page).toHaveURL(/\/pt-br\/work$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Todos os projetos');
});

test('theme choice is applied and remembered', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/en');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.getByTestId('theme-toggle').click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('every page has one h1, a canonical URL and hreflang alternates', async ({ page }) => {
  for (const path of ['/en', '/fr/work', '/nl/about', '/es/colophon']) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}$`));
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
  }
});

test('keyboard users can skip to the content', async ({ page }) => {
  await page.goto('/en');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
});

test('contact form validates in the visitor language, then sends', async ({ page }) => {
  await page.goto('/fr#contact');
  await page.getByRole('button', { name: 'Envoyer le message' }).click();
  await expect(page.getByText('Indiquez votre nom.')).toBeVisible();
  await expect(page.getByText('Indiquez une adresse e-mail valide.')).toBeVisible();

  await page.getByLabel('Nom').fill('Recruteur E2E');
  await page.getByLabel('E-mail').fill('recruteur@example.com');
  await page.getByLabel('Objet').fill('Poste backend à Bruxelles');
  await page.getByLabel('Message').fill('Bonjour William, ceci est un message de test automatisé.');
  await page.waitForTimeout(3100); // the API drops forms submitted faster than a person types
  await page.getByRole('button', { name: 'Envoyer le message' }).click();
  await expect(page.getByRole('status')).toContainText('Merci');
});

test('unknown pages return a localized 404', async ({ page }) => {
  const response = await page.goto('/es/work/this-project-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esta página no existe');
});
