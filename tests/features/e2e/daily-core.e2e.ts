import { expect, test } from '@playwright/test';
import { postMigrationSnapshot, resetDb } from '../../support/e2e/http';

test.beforeEach(async ({ page }) => {
  const response = await resetDb(page.request);
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

test('packaged food search keeps cached local hits selectable alongside remote results', async ({
  page,
}) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await postMigrationSnapshot(page.request, {
    data: {
      snapshot: {
        dailyRecords: [],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'off:049000028911',
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
            name: 'Diet Cola',
            sourceType: 'open-food-facts',
            sourceName: 'Open Food Facts',
            brandName: 'Acme Drinks',
            barcode: '049000028911',
            calories: 1,
            protein: 0,
            fiber: 0,
            carbs: 0,
            fat: 0,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [],
        derivedGroceryItems: [],
        manualGroceryItems: [],
        workoutTemplates: [],
        exerciseCatalogItems: [],
        favoriteMeals: [],
        healthEvents: [],
        healthTemplates: [],
        sobrietyEvents: [],
        assessmentResults: [],
        importBatches: [],
        importArtifacts: [],
        reviewSnapshots: [],
        adherenceMatches: [],
      },
    },
  });
  expect(seedResponse.ok()).toBe(true);

  await page.goto('/nutrition');
  await page.getByLabel('Packaged product search').fill('cola');
  await page.getByRole('button', { name: 'Search packaged foods' }).click();

  const mealLoggingSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Meal logging' }),
  });
  const dietColaRow = mealLoggingSection.locator('li').filter({ hasText: 'Diet Cola Acme Drinks' });
  await expect(dietColaRow).toBeVisible();

  await dietColaRow.getByRole('button', { name: 'Use packaged' }).click();
  await expect(page.getByLabel('Meal name')).toHaveValue('Diet Cola');
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
