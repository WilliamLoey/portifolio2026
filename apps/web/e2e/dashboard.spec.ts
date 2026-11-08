import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const slug = `e2e-${Date.now()}`;
const title = `E2E project ${slug.slice(-5)}`;

async function publicStatus(page: Page, url: string) {
  // Public pages are cached and refreshed by the signed revalidation call; poll briefly.
  for (let i = 0; i < 10; i++) {
    const response = await page.request.get(url);
    if (response.status() === 200) return 200;
    await page.waitForTimeout(500);
  }
  return (await page.request.get(url)).status();
}

test.describe.serial('content workflow', () => {
  let editUrl = '';

  test('creates a draft that visitors cannot see', async ({ page }) => {
    await page.goto('/dashboard/projects/new');
    await page.getByLabel('Title').fill(title);
    await expect(page.getByLabel('URL', { exact: true })).toHaveValue(/^e2e-project/);
    await page.getByLabel('URL', { exact: true }).fill(slug);
    await page.getByLabel('Summary').fill('Created by the end-to-end test suite.');
    await page.getByLabel('Case study').fill('## Problem\n\nA test.\n\n## Result\n\nIt works.');

    // French version on its own tab.
    await page.getByRole('tab', { name: /FR/ }).click();
    await page.getByLabel('Title').fill(`Projet E2E ${slug.slice(-5)}`);
    await page.getByLabel('Summary').fill('Créé par les tests de bout en bout.');
    await page.getByLabel('Case study').fill('Une étude de cas de test.');

    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page).toHaveURL(/\/dashboard\/projects\/(?!new$)[a-z0-9]+$/);
    editUrl = page.url();
    await expect(page.getByText('Draft: not visible to visitors.')).toBeVisible();

    const response = await page.request.get(`/en/work/${slug}`);
    expect(response.status()).toBe(404);
  });

  test('previews the draft without publishing it', async ({ page, context }) => {
    await page.goto(editUrl);
    await page.getByRole('tab', { name: /FR/ }).click();
    const [preview] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: /Preview/ }).click()]);
    await preview.waitForLoadState();
    await expect(preview).toHaveURL(/\/fr\/preview\/project\//);
    await expect(preview.getByRole('heading', { level: 1 })).toHaveText(`Projet E2E ${slug.slice(-5)}`);
    await expect(preview.getByRole('status')).toContainText('Aperçu');
  });

  test('publishes: the case study goes live in each written language', async ({ page }) => {
    await page.goto(editUrl);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByText('Visitors see this version.')).toBeVisible();

    expect(await publicStatus(page, `/fr/work/${slug}`)).toBe(200);
    await page.goto(`/fr/work/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Projet E2E ${slug.slice(-5)}`);

    // Dutch is not written: English text, with a notice.
    await page.goto(`/nl/work/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByRole('note')).toContainText('nog niet vertaald');
  });

  test('edits stay private until republished', async ({ page }) => {
    await page.goto(editUrl);
    await page.getByLabel('Title').fill(`${title} v2`);
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Saved. These edits are not public yet.')).toBeVisible();

    await page.goto(`/en/work/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  });

  test('uploads an image and uses it as the cover', async ({ page }) => {
    await page.goto(editUrl);
    await page.getByRole('button', { name: 'Choose image' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="file"]').setInputFiles(path.join(__dirname, 'fixtures', 'cover.png'));
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Change image' })).toBeVisible();
    await page.getByRole('button', { name: 'Save & publish' }).click();
    await expect(page.getByText('Visitors see this version.')).toBeVisible();

    await page.goto(`/en/work/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${title} v2`);
    await expect(page.locator('article img').first()).toBeVisible();
  });

  test('unpublishes and deletes', async ({ page }) => {
    await page.goto(editUrl);
    await page.getByRole('button', { name: 'Unpublish' }).click();
    await expect(page.getByText('Draft: not visible to visitors.')).toBeVisible();
    expect((await page.request.get(`/en/work/${slug}`)).status()).toBe(404);

    await page.getByRole('button', { name: 'Delete project' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete project' }).click();
    await expect(page).toHaveURL(/\/dashboard\/projects$/);
    await expect(page.getByText(`${title} v2`)).toHaveCount(0);
  });
});

test('the overview shows statistics and the inbox lists contact messages', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Published projects', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Messages/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Messages', level: 1 })).toBeVisible();
});

test('the translations matrix lists missing languages', async ({ page }) => {
  await page.goto('/dashboard/translations');
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('rowheader', { name: /Profile/ })).toBeVisible();
});

test('admin API calls are rejected without a session', async ({ browser }) => {
  const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const response = await anonymous.request.get('/api/admin/projects');
  expect(response.status()).toBe(401);
  const page = await anonymous.newPage();
  await page.goto('/dashboard/media');
  await expect(page).toHaveURL(/\/dashboard\/login/);
  await anonymous.close();
});
