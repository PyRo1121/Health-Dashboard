import { expect, test } from '@playwright/test';

const resetHeaders = { 'x-health-reset-token': 'codex-e2e' };

test.beforeEach(async ({ page }) => {
  const response = await page.request.post('/api/test/reset-db', { headers: resetHeaders });
  expect(response.ok()).toBe(true);
});

test('health loop captures symptom, anxiety, sleep context, and supplement template logs', async ({
  page,
}) => {
  await page.goto('/health');

  await page.getByRole('textbox', { name: 'Symptom', exact: true }).fill('Headache');
  await page.getByLabel('Symptom severity').fill('4');
  await page.getByLabel('Symptom note').fill('After lunch');
  await page.getByRole('button', { name: 'Log symptom' }).click();
  await expect(page.getByText(/Symptom logged\./i)).toBeVisible();

  await page.getByLabel('Anxiety intensity').fill('4');
  await page.getByLabel('Anxiety trigger').fill('Crowded store');
  await page.getByLabel('Anxiety note').fill('Walked it off');
  await page.getByRole('button', { name: 'Log anxiety' }).click();
  await expect(page.getByText(/Anxiety episode logged\./i)).toBeVisible();

  await page.getByLabel('Sleep note').fill('Woke up twice');
  await page.getByLabel('Sleep restfulness').fill('2');
  await page.getByRole('button', { name: 'Log sleep note' }).click();
  await expect(page.getByText(/Sleep context logged\./i)).toBeVisible();

  await page.getByLabel('Template name').fill('Magnesium glycinate');
  await page.getByLabel('Default dose').fill('2');
  await page.getByLabel('Default unit').fill('capsules');
  await page.getByRole('button', { name: 'Save template' }).click();
  await expect(page.getByText(/Template saved\./i)).toBeVisible();
  await page.getByRole('button', { name: 'Log now' }).click();

  const healthStream = page.locator('.event-list');
  await expect(healthStream).toContainText('Headache');
  await expect(healthStream).toContainText('Anxiety episode');
  await expect(healthStream).toContainText('Sleep note');
  await expect(healthStream).toContainText('Magnesium glycinate');
});

test('health loop signals feed the weekly review', async ({ page }) => {
  await page.goto('/today');
  await page.getByLabel('Mood').fill('4');
  await page.getByLabel('Energy').fill('3');
  await page.getByLabel('Stress').fill('2');
  await page.getByLabel('Focus').fill('4');
  await page.getByLabel('Sleep hours').fill('6');
  await page.getByLabel('Sleep quality').fill('3');
  await page.getByRole('button', { name: 'Save check-in' }).click();

  await page.goto('/health');
  await page.getByLabel('Anxiety intensity').fill('4');
  await page.getByLabel('Anxiety trigger').fill('Busy inbox');
  await page.getByRole('button', { name: 'Log anxiety' }).click();
  await expect(page.getByText(/Anxiety episode logged\./i)).toBeVisible();

  await page.goto('/review');
  await expect(page.getByText('Health highlights')).toBeVisible();
  await expect(page.getByText(/Low sleep lined up with higher anxiety/i)).toBeVisible();
});
