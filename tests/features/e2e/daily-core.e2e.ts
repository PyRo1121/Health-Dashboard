import { expect, test } from '@playwright/test';

const resetHeaders = { 'x-health-reset-token': 'codex-e2e' };

test.beforeEach(async ({ page }) => {
  const response = await page.request.post('/api/test/reset-db', { headers: resetHeaders });
  expect(response.ok()).toBe(true);
});

test('today daily check-in flow', async ({ page }) => {
  await page.goto('/today');
  await expect(page.getByText("Today's recommendation")).toBeVisible();
  await expect(page.getByText(/No strong recommendation yet\./i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open check-in' })).toBeVisible();
  await page.getByLabel('Mood').fill('4');
  await page.getByLabel('Energy').fill('3');
  await page.getByLabel('Stress').fill('2');
  await page.getByLabel('Focus').fill('5');
  await page.getByLabel('Sleep hours').fill('7.5');
  await page.getByLabel('Sleep quality').fill('4');
  await page.getByLabel('Today note').fill('Steady start.');
  await page.getByRole('button', { name: 'Save check-in' }).click();

  await expect(page.getByText('Saved for today.')).toBeVisible();
  await expect(page.getByText('Steady start.')).toBeVisible();
  await expect(page.locator('.event-list strong', { hasText: 'mood' })).toBeVisible();
});

test('journal entry flow', async ({ page }) => {
  await page.goto('/journal');
  await page.getByLabel('Title').fill('Morning check-in');
  await page.getByLabel('Body').fill('Woke up steady and ready to work.');
  await page.getByRole('button', { name: 'Save entry' }).click();

  await expect(page.locator('.entry-list strong').first()).toHaveText('Morning check-in');
  await expect(page.locator('.entry-list')).toContainText('Woke up steady and ready to work.');
});

test('sobriety flow', async ({ page }) => {
  await page.goto('/sobriety');
  await page.getByRole('button', { name: 'Mark sober today' }).click();
  await page.getByLabel('Craving score').fill('4');
  await page.getByLabel('Craving note').fill('Stress spike after lunch.');
  await page.getByRole('button', { name: 'Log craving' }).click();
  await page.getByLabel('Lapse note').fill('Had a lapse after a rough evening.');
  await page.getByLabel('Recovery action').fill('Text sponsor');
  await page.getByRole('button', { name: 'Log lapse context' }).click();

  await expect(page.getByText(/Current streak: 1 day/i)).toBeVisible();
});

test('assessment flow with safety branch', async ({ page }) => {
  await page.goto('/assessments');

  for (let index = 1; index <= 8; index += 1) {
    await page.getByLabel(`PHQ-9 question ${index}`).selectOption('1');
  }
  await page.getByLabel('PHQ-9 question 9').selectOption('1');
  await page.getByRole('button', { name: 'Save assessment' }).click();

  await expect(page.getByText(/Score: 9/i)).toBeVisible();
  await expect(page.getByText(/need more support than this app can provide/i)).toBeVisible();
});

test('nutrition flow with recurring meal reuse', async ({ page }) => {
  await page.goto('/nutrition');
  await page.getByLabel('Food search').fill('oatmeal');
  await page.getByRole('button', { name: 'Search foods' }).click();
  await page.getByRole('button', { name: 'Use match' }).click();
  await page.getByRole('button', { name: 'Save meal' }).click();
  await expect(page.getByText(/Meal saved\./i)).toBeVisible();
  await page.getByRole('button', { name: 'Save as recurring meal' }).click();
  await expect(page.getByText(/Recurring meal saved\./i)).toBeVisible();
  await page.getByRole('button', { name: 'Reuse meal' }).first().click();
  await expect(page.getByText(/Recurring meal reused\./i)).toBeVisible();

  const todaySummarySection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Today summary' }),
  });
  await expect(todaySummarySection.locator('.summary-list')).toContainText('Calories: 640');
});

test('weekly review flow', async ({ page }) => {
  await page.goto('/today');
  await page.getByLabel('Mood').fill('5');
  await page.getByLabel('Energy').fill('4');
  await page.getByLabel('Stress').fill('2');
  await page.getByLabel('Focus').fill('4');
  await page.getByLabel('Sleep hours').fill('8');
  await page.getByLabel('Sleep quality').fill('4');
  await page.getByRole('button', { name: 'Save check-in' }).click();

  await page.goto('/nutrition');
  await page.getByLabel('Food search').fill('oatmeal');
  await page.getByRole('button', { name: 'Search foods' }).click();
  await page.getByRole('button', { name: 'Use match' }).click();
  await page.getByRole('button', { name: 'Save meal' }).click();

  await page.goto('/sobriety');
  await page.getByRole('button', { name: 'Mark sober today' }).click();

  await page.goto('/assessments');
  for (let index = 1; index <= 5; index += 1) {
    await page.getByLabel(`PHQ-9 question ${index}`).selectOption('1');
  }
  for (let index = 6; index <= 9; index += 1) {
    await page.getByLabel(`PHQ-9 question ${index}`).selectOption('0');
  }
  await page.getByRole('button', { name: 'Save assessment' }).click();

  await page.goto('/review');
  await expect(page.getByText(/Weekly headline/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Next-week experiment' })).toBeVisible();
  await page.getByLabel('Next-week experiment').selectOption('Increase hydration tracking');
  await page.getByRole('button', { name: 'Save experiment' }).click();
  await expect(page.getByText(/Experiment saved\./i)).toBeVisible();
  await expect(page.getByText(/Current verdict on saved experiment/i)).toBeVisible();
  await expect(
    page.getByText('Saved experiment: Increase hydration tracking', { exact: true })
  ).toBeVisible();
});
