import { expect, test } from '@playwright/test';

const resetHeaders = { 'x-health-reset-token': 'codex-e2e' };

function emptySnapshot() {
  return {
    dailyRecords: [],
    journalEntries: [],
    foodEntries: [],
    foodCatalogItems: [],
    recipeCatalogItems: [],
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
  };
}

test.beforeEach(async ({ page }) => {
  const response = await page.request.post('/api/test/reset-db', { headers: resetHeaders });
  expect(response.ok()).toBe(true);
});

test('weekly plan loop connects plan, today, and review', async ({ page }) => {
  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        ...emptySnapshot(),
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
      },
    },
  });
  expect(seedResponse.ok()).toBe(true);

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
  await expect(page.getByText(/No workout templates yet\./i)).toBeVisible();
  await expect(page.getByText(/No grocery items yet\./i)).toBeVisible();

  await page.getByLabel('Recipe').selectOption('themealdb:52772');
  await page.getByRole('button', { name: 'Add to week' }).click();
  await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();
  await expect(page.getByText('soy sauce')).toBeVisible();
  await expect(page.getByText('chicken breast')).toBeVisible();

  await page.getByRole('button', { name: 'On hand' }).first().click();
  await expect(page.getByText(/Grocery item updated\./i)).toBeVisible();

  await page.getByLabel('Template name').fill('Full body reset');
  await page.getByLabel('Template goal').fill('Recovery');
  await page.getByLabel('Exercise 1').fill('Goblet squat');
  await page.getByLabel('Sets 1').fill('3');
  await page.getByLabel('Reps 1').fill('8');
  await page.getByLabel('Rest 1').fill('60');
  await page.getByRole('button', { name: 'Save template' }).click();
  await expect(page.getByText(/Workout template saved\./i)).toBeVisible();

  await page.getByLabel('Plan slot type').selectOption('workout');
  await page.getByLabel('Workout template').selectOption({ label: 'Full body reset' });
  await page.getByRole('button', { name: 'Add to week' }).click();
  await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();

  await page.getByLabel('Plan slot type').selectOption('meal');
  await page.getByLabel('Meal source').selectOption('food');
  await page.getByLabel('Saved food').selectOption({ label: 'Greek yogurt bowl' });
  await page.getByRole('button', { name: 'Add to week' }).click();
  await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();

  await page.goto('/groceries');
  await expect(page.getByRole('heading', { name: 'Groceries' })).toBeVisible();
  await expect(page.getByText('soy sauce')).toBeVisible();
  await page.getByRole('button', { name: 'Check' }).first().click();
  await expect(page.getByText(/Grocery item updated\./i)).toBeVisible();
  await expect(page.getByText(/Checked/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'Exclude' }).nth(1).click();
  await expect(page.getByText(/Grocery item updated\./i)).toBeVisible();

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  const plannedWorkoutSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned workout' }),
  });
  await expect(plannedMealSection.getByText('Greek yogurt bowl')).toBeVisible();
  await expect(plannedWorkoutSection).toContainText('Full body reset');
  await page.getByRole('button', { name: 'Log planned meal' }).click();
  await expect(page.getByText(/Planned meal logged\./i)).toBeVisible();
  await page.getByRole('button', { name: 'Mark workout done' }).click();
  await expect(page.getByText(/Plan item marked done\./i)).toBeVisible();
  const todayPlanSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: "Today's plan" }),
  });
  await todayPlanSection.getByRole('button', { name: 'Skip' }).first().click();
  await expect(page.getByText(/Plan item marked skipped\./i)).toBeVisible();

  await page.getByLabel('Mood').fill('4');
  await page.getByLabel('Energy').fill('3');
  await page.getByLabel('Stress').fill('2');
  await page.getByLabel('Focus').fill('4');
  await page.getByLabel('Sleep hours').fill('7.5');
  await page.getByLabel('Sleep quality').fill('4');
  await page.getByRole('button', { name: 'Save check-in' }).click();
  await expect(page.getByText(/Saved for today\./i)).toBeVisible();

  await page.goto('/review');
  await expect(page.getByText(/Plan follow-through/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Actual adherence' })).toBeVisible();
  await expect(page.getByText('67%')).toBeVisible();
  await expect(page.getByText('50%')).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();
  await expect(page.getByText(/This Week: 2\/3 plan items completed, 1 skipped\./i)).toBeVisible();
  await expect(page.getByText(/Meals planned: 1\/2 completed\./i)).toBeVisible();
  await expect(page.getByText(/Workouts planned: 1\/1 completed\./i)).toBeVisible();
  await expect(
    page.getByText(/Meal miss: Teriyaki Chicken Casserole was skipped\./i)
  ).toBeVisible();
  await expect(
    page.getByText(/Workout hit: Full body reset was completed as planned\./i)
  ).toBeVisible();
  await expect(page.getByText(/Groceries: 1\/2 checked, 1 on hand, 1 excluded\./i)).toBeVisible();
  await expect(
    page.getByText(
      /Potential waste: Teriyaki Chicken Casserole was missed after 1 grocery item had already been sourced\./i
    )
  ).toBeVisible();
  await expect(
    page.getByText(
      /Grocery miss: Teriyaki Chicken Casserole still had 1 unresolved grocery item when the meal was missed\./i
    )
  ).toBeVisible();
  await expect(page.getByText('Skip', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review recipe' })).toBeVisible();
});

test('grocery checklist merges duplicate ingredients across recipes', async ({ page }) => {
  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        ...emptySnapshot(),
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
          {
            id: 'themealdb:52773',
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
            title: 'Soy glazed bowl',
            sourceType: 'themealdb',
            sourceName: 'TheMealDB',
            externalId: '52773',
            mealType: 'dinner',
            cuisine: 'Japanese',
            ingredients: ['1 tbsp soy sauce'],
          },
        ],
      },
    },
  });
  expect(seedResponse.ok()).toBe(true);

  await page.goto('/plan');
  await page.getByLabel('Recipe').selectOption('themealdb:52772');
  await page.getByRole('button', { name: 'Add to week' }).click();
  await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();

  await page.getByLabel('Recipe').selectOption('themealdb:52773');
  await page.getByRole('button', { name: 'Add to week' }).click();
  await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();

  await page.goto('/groceries');
  const soySauceRows = page.locator('.entry-list strong', { hasText: 'soy sauce' });
  await expect(soySauceRows).toHaveCount(1);
  await expect(page.getByText(/Pantry · 3\/4 cup \+ 1 tbsp/i)).toBeVisible();
  await expect(page.getByText(/Teriyaki Chicken Casserole, Soy glazed bowl/i)).toBeVisible();
});

test('manual grocery items persist after weekly plan recompute', async ({ page }) => {
  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        ...emptySnapshot(),
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
          {
            id: 'themealdb:52773',
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
            title: 'Lentil soup',
            sourceType: 'themealdb',
            sourceName: 'TheMealDB',
            externalId: '52773',
            mealType: 'dinner',
            cuisine: 'Mediterranean',
            ingredients: ['1 can lentils'],
          },
        ],
      },
    },
  });
  expect(seedResponse.ok()).toBe(true);

  await page.goto('/plan');
  await page.getByLabel('Recipe').selectOption('themealdb:52772');
  await page.getByRole('button', { name: 'Add to week' }).click();
  await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();

  await page.goto('/groceries');
  await page.getByLabel('Manual grocery item').fill('Paper towels');
  await page.getByRole('button', { name: 'Add manual item' }).click();
  await expect(page.getByText(/Manual grocery item added\./i)).toBeVisible();
  await expect(page.getByText('Paper towels')).toBeVisible();

  await page.goto('/plan');
  await page.getByLabel('Recipe').selectOption('themealdb:52773');
  await page.getByRole('button', { name: 'Add to week' }).click();
  await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();

  await page.goto('/groceries');
  await expect(page.getByText('Paper towels')).toBeVisible();
  await expect(page.locator('.entry-list').getByText('Manual item', { exact: true })).toBeVisible();
  await expect(page.getByText('lentils')).toBeVisible();
});

test('review shows inferred adherence when a planned saved-food meal is logged manually', async ({
  page,
}) => {
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

  await page.goto('/nutrition');
  await page.getByLabel('Meal name').fill('Greek yogurt bowl');
  await page.getByLabel('Calories').fill('310');
  await page.getByLabel('Protein').fill('24');
  await page.getByLabel('Fiber').fill('6');
  await page.getByLabel('Carbs').fill('34');
  await page.getByLabel('Fat').fill('8');
  await page.getByRole('button', { name: 'Save meal' }).click();
  await expect(page.getByText(/Meal saved\./i)).toBeVisible();

  await page.goto('/review');
  await expect(page.getByRole('heading', { name: 'Actual adherence' })).toBeVisible();
  await expect(
    page
      .getByRole('article')
      .filter({ hasText: 'Meals' })
      .getByText(/1 hit, 0 misses, 1 inferred\./i)
  ).toBeVisible();
  await expect(
    page.getByText(/Meal inferred hit: Greek yogurt bowl matched a logged meal on/i)
  ).toBeVisible();
});
