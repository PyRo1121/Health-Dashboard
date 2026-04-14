import { expect, test } from '@playwright/test';

const resetHeaders = { 'x-health-reset-token': 'codex-e2e' };

test.beforeEach(async ({ page }) => {
  const response = await page.request.post('/api/test/reset-db', { headers: resetHeaders });
  expect(response.ok()).toBe(true);
});

test('weekly plan workout flows into today execution', async ({ page }) => {
  await page.goto('/plan');
  await page.getByLabel('Template name').fill('Full body reset');
  await page.getByLabel('Template goal').fill('Recovery');
  await page.getByLabel('Exercise 1').fill('Goblet squat');
  await page.getByLabel('Sets 1').fill('3');
  await page.getByLabel('Reps 1').fill('8');
  await page.getByLabel('Rest 1').fill('60');
  await page.getByRole('button', { name: 'Add exercise row' }).click();
  await page.getByLabel('Exercise 2').fill('Push-up');
  await page.getByLabel('Sets 2').fill('3');
  await page.getByLabel('Reps 2').fill('12');
  await page.getByLabel('Rest 2').fill('45');
  await page.getByRole('button', { name: 'Save template' }).click();
  await expect(page.getByText(/Workout template saved\./i)).toBeVisible();
  await expect(
    page.getByText(/Recovery · 2 exercises · Goblet squat · 3x8 · 60s rest/i)
  ).toBeVisible();

  await page.getByLabel('Plan slot type').selectOption('workout');
  await page.getByLabel('Workout template').selectOption({ label: 'Full body reset' });
  await page.getByRole('button', { name: 'Add to week' }).click();
  await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();

  await page.goto('/today');
  const plannedWorkoutSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned workout' }),
  });
  await expect(plannedWorkoutSection.getByText('Full body reset')).toBeVisible();
  await plannedWorkoutSection.getByRole('button', { name: 'Mark workout done' }).click();
  await expect(page.getByText(/Plan item marked done\./i)).toBeVisible();
});

test('weekly plan meal can be created from a saved food', async ({ page }) => {
  await page.goto('/nutrition');
  await page.getByLabel('Meal name').fill('Greek yogurt bowl');
  await page.getByLabel('Calories').fill('310');
  await page.getByLabel('Protein').fill('24');
  await page.getByLabel('Fiber').fill('6');
  await page.getByLabel('Carbs').fill('34');
  await page.getByLabel('Fat').fill('8');
  await page.getByRole('button', { name: 'Save as custom food' }).click();
  await expect(page.getByText(/Saved to custom food catalog\./i)).toBeVisible();

  await page.goto('/plan');
  await page.getByLabel('Meal source').selectOption('food');
  await page.getByLabel('Saved food').selectOption({ label: 'Greek yogurt bowl' });
  await page.getByRole('button', { name: 'Add to week' }).click();
  await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();
  await expect(page.getByText('Greek yogurt bowl')).toBeVisible();

  await page.goto('/today');
  await expect(page.getByText(/Saved food · Local catalog · 24g protein/i)).toBeVisible();
  await expect(page.getByText(/Projected protein: 24/i)).toBeVisible();
  await page.getByRole('button', { name: 'Log planned meal' }).click();
  await expect(page.getByText(/Planned meal logged\./i)).toBeVisible();
  await expect(page.getByText(/Latest meal: Greek yogurt bowl/i)).toBeVisible();
});

test('weekly plan recipe meal flows into today logging', async ({ page }) => {
  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [],
        recipeCatalogItems: [
          {
            id: 'themealdb:52772',
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
            title: 'Teriyaki Chicken Casserole',
            sourceType: 'themealdb',
            sourceName: 'TheMealDB',
            externalId: '52772',
            mealType: 'dinner',
            cuisine: 'Japanese',
            ingredients: ['3/4 cup soy sauce', '2 chicken breast'],
          },
        ],
        weeklyPlans: [],
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

  await page.goto('/plan');
  await page.getByLabel('Meal source').selectOption('recipe');
  await page.getByLabel('Recipe').selectOption({ label: 'Teriyaki Chicken Casserole' });
  await page.getByRole('button', { name: 'Add to week' }).click();
  await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  await expect(plannedMealSection.getByText('Teriyaki Chicken Casserole')).toBeVisible();
  await expect(plannedMealSection.getByText(/Meal type: dinner/i)).toBeVisible();
  await page.getByRole('button', { name: 'Log planned meal' }).click();
  await expect(page.getByText(/Planned meal logged\./i)).toBeVisible();
  await expect(page.getByText(/Latest meal: Teriyaki Chicken Casserole/i)).toBeVisible();
});
