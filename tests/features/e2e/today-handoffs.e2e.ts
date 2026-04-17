import { expect, test } from '@playwright/test';

const resetHeaders = { 'x-health-reset-token': 'codex-e2e' };

test.beforeEach(async ({ page }) => {
  const response = await page.request.post('/api/test/reset-db', { headers: resetHeaders });
  expect(response.ok()).toBe(true);
});

test('today recovery links into a prefilled journal note', async ({ page }) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: `daily:${localDay}`,
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            date: localDay,
            mood: 3,
            energy: 2,
            stress: 4,
            focus: 3,
            sleepHours: 5.5,
            sleepQuality: 2,
            freeformNote: 'Dragging today.',
          },
        ],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            name: 'Toast and jam',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 260,
            protein: 6,
            fiber: 2,
            carbs: 42,
            fat: 6,
          },
          {
            id: 'food-catalog-2',
            createdAt: '2026-04-02T08:05:00.000Z',
            updatedAt: '2026-04-02T08:05:00.000Z',
            name: 'Greek yogurt bowl',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 310,
            protein: 24,
            fiber: 6,
            carbs: 34,
            fat: 8,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-1',
            mealType: 'breakfast',
            title: 'Toast and jam',
            status: 'planned',
            order: 0,
          },
        ],
        derivedGroceryItems: [],
        manualGroceryItems: [],
        workoutTemplates: [],
        exerciseCatalogItems: [],
        favoriteMeals: [],
        healthEvents: [
          {
            id: 'symptom-1',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:1',
            sourceTimestamp: '2026-04-02T09:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'symptom',
            value: 4,
            payload: {
              kind: 'symptom',
              symptom: 'Headache',
              severity: 4,
              note: 'Heavy pressure behind the eyes.',
            },
          },
          {
            id: 'anxiety-1',
            createdAt: '2026-04-02T10:00:00.000Z',
            updatedAt: '2026-04-02T10:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'anxiety:1',
            sourceTimestamp: '2026-04-02T10:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'anxiety-episode',
            value: 7,
            payload: {
              kind: 'anxiety',
              intensity: 7,
              trigger: 'Cramped schedule',
              durationMinutes: 25,
            },
          },
        ],
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

  await page.goto('/today');
  await page.getByRole('button', { name: 'Capture recovery note' }).click();
  await expect(page).toHaveURL(/\/journal/);
  await expect(page.getByLabel('Title')).toHaveValue('Recovery note');
  await expect(page.getByLabel('Body')).toHaveValue(/sleep landed under 6 hours/i);
  await expect(page.getByText(/Loaded from today recovery\./i)).toBeVisible();
  await expect(page.getByText(/Linked context: 2 events\./i)).toBeVisible();
});

test('journal lets the user link a same-day signal and save it', async ({ page }) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
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
        healthEvents: [
          {
            id: 'symptom-1',
            createdAt: '2026-04-05T09:00:00.000Z',
            updatedAt: '2026-04-05T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:1',
            sourceTimestamp: '2026-04-05T09:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'symptom',
            value: 4,
            payload: {
              kind: 'symptom',
              symptom: 'Headache',
              severity: 4,
            },
          },
        ],
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

  await page.goto('/journal');
  await expect(page.getByText('Available context')).toBeVisible();
  await page.getByRole('button', { name: 'Link signal Symptom' }).click();
  await expect(page.getByText(/Linked context: 1 events\./i)).toBeVisible();
  await page.getByLabel('Body').fill('Headache tracked after lunch.');
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.getByText(/Entry saved\./i)).toBeVisible();
  await expect(page.getByText(/1 linked signal/i)).toBeVisible();
});

test('today event stream keeps same-day events in chronological order', async ({ page }) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
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
        healthEvents: [
          {
            id: 'anxiety-1',
            createdAt: '2026-04-02T09:10:00.000Z',
            updatedAt: '2026-04-02T09:10:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'anxiety:1',
            sourceTimestamp: '2026-04-02T09:10:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'anxiety-episode',
            value: 7,
            payload: {
              kind: 'anxiety',
              intensity: 7,
              trigger: 'Crowded commute',
            },
          },
          {
            id: 'sleep-1',
            createdAt: '2026-04-02T07:00:00.000Z',
            updatedAt: '2026-04-02T07:00:00.000Z',
            sourceType: 'native-companion',
            sourceApp: 'HealthKit Companion · Pyro iPhone',
            sourceRecordId: 'sleep:1',
            sourceTimestamp: '2026-04-02T06:55:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 0.98,
            eventType: 'sleep-duration',
            value: 6.5,
            unit: 'hours',
          },
        ],
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

  await page.goto('/today');

  const eventStreamSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Same-day event stream' }),
  });
  await expect(eventStreamSection.getByText('Sleep duration')).toBeVisible();
  await expect(eventStreamSection.getByText('Anxiety episode')).toBeVisible();
  await expect(eventStreamSection.locator('li strong')).toHaveText([
    'Sleep duration',
    'Anxiety episode',
  ]);
});

test('planned meal flows from nutrition into today logging', async ({ page }) => {
  await page.goto('/nutrition');
  await page.getByLabel('Food search').fill('oatmeal');
  await page.getByRole('button', { name: 'Search foods' }).click();
  await page.getByRole('button', { name: 'Use match' }).click();
  await page.getByRole('button', { name: 'Plan next meal' }).click();
  await expect(page.getByText(/Planned next meal saved\./i)).toBeVisible();

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  await expect(plannedMealSection.getByText('Oatmeal with berries')).toBeVisible();
  await expect(page.getByText('Projected calories: 320')).toBeVisible();
  await expect(page.getByText('Protein pace', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Log planned meal' }).click();
  await expect(page.getByText(/Planned meal logged\./i)).toBeVisible();

  const dailyBriefingSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Daily briefing' }),
  });
  await expect(dailyBriefingSection.locator('.summary-list')).toContainText('Meals logged: 1');
  await expect(page.getByText('Calories: 320')).toBeVisible();
});

test('today can clear a planned meal handoff after nutrition queues it', async ({ page }) => {
  await page.goto('/nutrition');
  await page.getByLabel('Food search').fill('oatmeal');
  await page.getByRole('button', { name: 'Search foods' }).click();
  await page.getByRole('button', { name: 'Use match' }).click();
  await page.getByRole('button', { name: 'Plan next meal' }).click();
  await expect(page.getByText(/Planned next meal saved\./i)).toBeVisible();

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  await expect(plannedMealSection.getByText('Oatmeal with berries')).toBeVisible();

  await plannedMealSection.getByRole('button', { name: 'Clear plan' }).click();
  await expect(page.getByText(/Planned meal cleared\./i)).toBeVisible();
  await expect(page.getByText(/No meal queued up\./i)).toBeVisible();
});

test('planning a recommended recipe keeps recipe identity and weekly groceries intact', async ({
  page,
}) => {
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

  await page.goto('/nutrition');
  const recommendationsSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Recommended next' }),
  });
  await expect(recommendationsSection.getByText('Teriyaki Chicken Casserole')).toBeVisible();
  await recommendationsSection.getByRole('button', { name: 'Plan next' }).click();
  await expect(page.getByText(/Planned next meal saved\./i)).toBeVisible();
  const nutritionPlannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  await expect(nutritionPlannedMealSection.getByText('Teriyaki Chicken Casserole')).toBeVisible();
  await expect(nutritionPlannedMealSection.getByText(/Meal type: dinner/i)).toBeVisible();
  await expect(nutritionPlannedMealSection.getByText(/Calories: 0/i)).toHaveCount(0);
  await expect(nutritionPlannedMealSection.getByText(/Protein: 0/i)).toHaveCount(0);

  await page.goto('/plan');
  const weekBoardSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Week board' }),
  });
  await expect(weekBoardSection.getByText('Teriyaki Chicken Casserole')).toBeVisible();
  await expect(page.getByText(/dinner · Japanese/i)).toBeVisible();
  await expect(page.getByText('soy sauce')).toBeVisible();
  await expect(page.getByText('chicken breast')).toBeVisible();

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  await expect(plannedMealSection.getByText('Teriyaki Chicken Casserole')).toBeVisible();
  await expect(plannedMealSection.getByText(`Meal type: dinner`)).toBeVisible();
  await expect(plannedMealSection.getByText(/3\/4 cup soy sauce/i)).toBeVisible();
  await expect(plannedMealSection.getByText(/Calories: 0/i)).toHaveCount(0);
  await expect(plannedMealSection.getByText(/Protein: 0/i)).toHaveCount(0);

  const nutritionPulseSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Nutrition pulse' }),
  });
  await expect(nutritionPulseSection.getByText(/If you log the planned meal next:/i)).toHaveCount(
    0
  );
  await expect(nutritionPulseSection.getByText(/Planned next:/i)).toHaveCount(0);
  await expect(nutritionPulseSection.getByText(/Protein is still low so far\./i)).toHaveCount(0);
  await expect(
    nutritionPulseSection.getByText(/nutrition totals are still unknown/i)
  ).toBeVisible();
  await expect(
    page.getByText(/changes today's intake more than another unplanned snack/i)
  ).toHaveCount(0);
});

test('nutrition planning replaces stale planned-food slots instead of leaving the handoff broken', async ({
  page,
}) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'stale-slot-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'missing-food-1',
            mealType: 'breakfast',
            title: 'Broken breakfast',
            status: 'planned',
            order: 0,
          },
          {
            id: 'stale-slot-2',
            createdAt: '2026-04-02T08:05:00.000Z',
            updatedAt: '2026-04-02T08:05:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'missing-food-2',
            mealType: 'lunch',
            title: 'Broken lunch',
            status: 'planned',
            order: 1,
          },
        ],
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
  await expect(page.getByText('Planned meal unavailable.')).toBeVisible();
  await expect(
    page.getByText('That planned meal no longer exists. Replace it in Plan before using it.')
  ).toBeVisible();

  await page.getByLabel('Food search').fill('oatmeal');
  await page.getByRole('button', { name: 'Search foods' }).click();
  await page.getByRole('button', { name: 'Use match' }).click();
  await page.getByRole('button', { name: 'Plan next meal' }).click();

  const nutritionPlannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  await expect(page.getByText(/Planned next meal saved\./i)).toBeVisible();
  await expect(nutritionPlannedMealSection.getByText('Oatmeal with berries')).toBeVisible();
  await expect(nutritionPlannedMealSection.getByText('Source: Local catalog')).toBeVisible();
  await expect(
    page.getByText('That planned meal no longer exists. Replace it in Plan before using it.')
  ).not.toBeVisible();

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  await expect(plannedMealSection.getByText('Oatmeal with berries')).toBeVisible();
});

test('switching from a food match to a recipe does not carry stale food macros into the recipe plan', async ({
  page,
}) => {
  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [],
        recipeCatalogItems: [
          {
            id: 'recipe-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            title: 'Teriyaki Chicken Casserole',
            sourceType: 'themealdb',
            sourceName: 'TheMealDB',
            externalId: '52772',
            mealType: 'dinner',
            cuisine: 'Japanese',
            ingredients: ['Soy sauce', 'Chicken breast', 'Rice'],
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

  await page.goto('/nutrition');
  await page.getByLabel('Food search').fill('oatmeal');
  await page.getByRole('button', { name: 'Search foods' }).click();
  await page.getByRole('button', { name: 'Use match' }).click();

  await expect(page.getByLabel('Calories')).toHaveValue('320');
  await expect(page.getByLabel('Protein')).toHaveValue('12');

  await page.getByLabel('Recipe search').fill('teriyaki');
  await page.getByRole('button', { name: 'Search recipes' }).click();
  await page
    .locator('.recipe-search li')
    .first()
    .getByRole('button', { name: 'Use recipe' })
    .click();

  await expect(page.getByLabel('Meal name')).toHaveValue('Teriyaki Chicken Casserole');
  await expect(page.getByLabel('Meal type')).toHaveValue('dinner');
  await expect(page.getByLabel('Calories')).toHaveValue('');
  await expect(page.getByLabel('Protein')).toHaveValue('');
  await expect(page.getByLabel('Fiber')).toHaveValue('');
  await expect(page.getByLabel('Carbs')).toHaveValue('');
  await expect(page.getByLabel('Fat')).toHaveValue('');

  await page.getByRole('button', { name: 'Plan next meal' }).click();
  await expect(page.getByText(/Planned next meal saved\./i)).toBeVisible();

  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  await expect(plannedMealSection.getByText('Teriyaki Chicken Casserole')).toBeVisible();
  await expect(plannedMealSection.getByText('Meal type: dinner')).toBeVisible();
  await expect(plannedMealSection.getByText('Calories: 0')).toHaveCount(0);
  await expect(plannedMealSection.getByText('Protein: 0')).toHaveCount(0);
});

test('switching from a recipe back to a food match does not leak hidden recipe notes into the food plan', async ({
  page,
}) => {
  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [],
        recipeCatalogItems: [
          {
            id: 'recipe-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            title: 'Teriyaki Chicken Casserole',
            sourceType: 'themealdb',
            sourceName: 'TheMealDB',
            externalId: '52772',
            mealType: 'dinner',
            cuisine: 'Japanese',
            ingredients: ['3/4 cup soy sauce', '2 chicken breast', 'Rice'],
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

  await page.goto('/nutrition');
  await page.getByLabel('Recipe search').fill('teriyaki');
  await page.getByRole('button', { name: 'Search recipes' }).click();
  const mealLoggingSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Meal logging' }),
  });
  await mealLoggingSection
    .locator('.recipe-search li')
    .filter({ hasText: 'Teriyaki Chicken Casserole' })
    .first()
    .getByRole('button', { name: 'Use recipe' })
    .click();

  await expect(page.getByLabel('Meal name')).toHaveValue('Teriyaki Chicken Casserole');
  await expect(
    page.getByText(/Loaded Teriyaki Chicken Casserole into the meal form\./i)
  ).toBeVisible();

  await page.getByLabel('Food search').fill('oatmeal');
  await page.getByRole('button', { name: 'Search foods' }).click();
  await page.getByRole('button', { name: 'Use match' }).click();
  await expect(page.getByLabel('Meal name')).toHaveValue('Oatmeal with berries');

  await page.getByRole('button', { name: 'Plan next meal' }).click();
  await expect(page.getByText(/Planned next meal saved\./i)).toBeVisible();

  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  await expect(plannedMealSection.getByText('Oatmeal with berries')).toBeVisible();
  await expect(plannedMealSection).not.toContainText('3/4 cup soy sauce');
  await expect(plannedMealSection).not.toContainText('2 chicken breast');
});

test('today shows recovery-aware fallback when sleep and symptoms are rough', async ({ page }) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: `daily:${localDay}`,
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            date: localDay,
            mood: 3,
            energy: 2,
            stress: 4,
            focus: 3,
            sleepHours: 5.5,
            sleepQuality: 2,
            freeformNote: 'Dragging today.',
          },
        ],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            name: 'Toast and jam',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 260,
            protein: 6,
            fiber: 2,
            carbs: 42,
            fat: 6,
          },
          {
            id: 'food-catalog-2',
            createdAt: '2026-04-02T08:05:00.000Z',
            updatedAt: '2026-04-02T08:05:00.000Z',
            name: 'Greek yogurt bowl',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 310,
            protein: 24,
            fiber: 6,
            carbs: 34,
            fat: 8,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-1',
            mealType: 'breakfast',
            title: 'Toast and jam',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-workout-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'workout',
            itemType: 'workout-template',
            itemId: 'workout-template-1',
            title: 'Full body reset',
            status: 'planned',
            order: 1,
          },
        ],
        derivedGroceryItems: [],
        manualGroceryItems: [],
        workoutTemplates: [
          {
            id: 'workout-template-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            title: 'Full body reset',
            goal: 'Recovery',
            exerciseRefs: [{ name: 'Goblet squat', reps: '8', sets: 3, restSeconds: 60 }],
          },
        ],
        exerciseCatalogItems: [],
        favoriteMeals: [],
        healthEvents: [
          {
            id: 'symptom-1',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:1',
            sourceTimestamp: '2026-04-02T09:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'symptom',
            value: 4,
            payload: {
              kind: 'symptom',
              symptom: 'Headache',
              severity: 4,
              note: 'Heavy pressure behind the eyes.',
            },
          },
          {
            id: 'anxiety-1',
            createdAt: '2026-04-02T10:00:00.000Z',
            updatedAt: '2026-04-02T10:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'anxiety:1',
            sourceTimestamp: '2026-04-02T10:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'anxiety-episode',
            value: 7,
            payload: {
              kind: 'anxiety',
              intensity: 7,
              trigger: 'Cramped schedule',
              durationMinutes: 25,
            },
          },
        ],
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

  await page.goto('/today');
  const recommendationSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: "Today's recommendation" }),
  });
  await expect(page.getByText("Today's recommendation")).toBeVisible();
  await expect(recommendationSection.getByText('Keep today lighter')).toBeVisible();
  await expect(recommendationSection.getByText(/High confidence/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Capture recovery note' })).toBeVisible();
  await expect(
    page.getByText('Sleep landed under 6 hours.', { exact: true }).first()
  ).toBeVisible();
  await expect(
    page.getByText('Meal fallback: keep the next meal familiar, easy, and protein-forward.')
  ).toBeVisible();
  await expect(
    page.getByText(
      'Workout fallback: downgrade Full body reset to a short walk, mobility reset, or full rest.'
    )
  ).toBeVisible();
  await expect(
    page.getByText(/Meal fallback: keep the next meal familiar, easy, and protein-forward\./i)
  ).toBeVisible();
  await expect(
    page.getByText(
      /Workout fallback: downgrade Full body reset to a short walk, mobility reset, or full rest\./i
    )
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Swap to recovery meal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Swap to recovery walk' })).toBeVisible();
});

test('today recovery actions swap in the fallback suggestions', async ({ page }) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: `daily:${localDay}`,
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            date: localDay,
            mood: 3,
            energy: 2,
            stress: 4,
            focus: 3,
            sleepHours: 5.5,
            sleepQuality: 2,
            freeformNote: 'Dragging today.',
          },
        ],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            name: 'Toast and jam',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 260,
            protein: 6,
            fiber: 2,
            carbs: 42,
            fat: 6,
          },
          {
            id: 'food-catalog-2',
            createdAt: '2026-04-02T08:05:00.000Z',
            updatedAt: '2026-04-02T08:05:00.000Z',
            name: 'Greek yogurt bowl',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 310,
            protein: 24,
            fiber: 6,
            carbs: 34,
            fat: 8,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-1',
            mealType: 'breakfast',
            title: 'Toast and jam',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-workout-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'workout',
            itemType: 'workout-template',
            itemId: 'workout-template-1',
            title: 'Full body reset',
            status: 'planned',
            order: 1,
          },
        ],
        derivedGroceryItems: [],
        manualGroceryItems: [],
        workoutTemplates: [
          {
            id: 'workout-template-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            title: 'Full body reset',
            goal: 'Recovery',
            exerciseRefs: [{ name: 'Goblet squat', reps: '8', sets: 3, restSeconds: 60 }],
          },
        ],
        exerciseCatalogItems: [],
        favoriteMeals: [],
        healthEvents: [
          {
            id: 'symptom-1',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:1',
            sourceTimestamp: '2026-04-02T09:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'symptom',
            value: 4,
            payload: {
              kind: 'symptom',
              symptom: 'Headache',
              severity: 4,
              note: 'Heavy pressure behind the eyes.',
            },
          },
          {
            id: 'anxiety-1',
            createdAt: '2026-04-02T10:00:00.000Z',
            updatedAt: '2026-04-02T10:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'anxiety:1',
            sourceTimestamp: '2026-04-02T10:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'anxiety-episode',
            value: 7,
            payload: {
              kind: 'anxiety',
              intensity: 7,
              trigger: 'Cramped schedule',
              durationMinutes: 25,
            },
          },
        ],
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

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  await page.getByRole('button', { name: 'Swap to recovery meal' }).click();
  await expect(page.getByText(/Recovery meal applied\./i)).toBeVisible();
  await expect(plannedMealSection.getByText('Greek yogurt bowl')).toBeVisible();

  const plannedWorkoutSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned workout' }),
  });
  await page.getByRole('button', { name: 'Swap to recovery walk' }).click();
  await expect(page.getByText(/Recovery workout applied\./i)).toBeVisible();
  await expect(plannedWorkoutSection.getByText('Recovery walk')).toBeVisible();
});

test('today recovery mode does not offer an unknown-macro saved food as a swap target', async ({
  page,
}) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: `daily:${localDay}`,
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            date: localDay,
            mood: 3,
            energy: 2,
            stress: 4,
            focus: 3,
            sleepHours: 5.5,
            sleepQuality: 2,
            freeformNote: 'Dragging today.',
          },
        ],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            name: 'Toast and jam',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 260,
            protein: 6,
            fiber: 2,
            carbs: 42,
            fat: 6,
          },
          {
            id: 'food-catalog-2',
            createdAt: '2026-04-02T08:05:00.000Z',
            updatedAt: '2026-04-02T08:05:00.000Z',
            name: 'Mystery soup',
            sourceType: 'custom',
            sourceName: 'Local catalog',
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-1',
            mealType: 'breakfast',
            title: 'Toast and jam',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-workout-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'workout',
            itemType: 'workout-template',
            itemId: 'workout-template-1',
            title: 'Full body reset',
            status: 'planned',
            order: 1,
          },
        ],
        derivedGroceryItems: [],
        manualGroceryItems: [],
        workoutTemplates: [
          {
            id: 'workout-template-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            title: 'Full body reset',
            goal: 'Recovery',
            exerciseRefs: [{ name: 'Goblet squat', reps: '8', sets: 3, restSeconds: 60 }],
          },
        ],
        exerciseCatalogItems: [],
        favoriteMeals: [],
        healthEvents: [
          {
            id: 'symptom-1',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:1',
            sourceTimestamp: '2026-04-02T09:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'symptom',
            value: 4,
            payload: {
              kind: 'symptom',
              symptom: 'Headache',
              severity: 4,
            },
          },
          {
            id: 'anxiety-1',
            createdAt: '2026-04-02T10:00:00.000Z',
            updatedAt: '2026-04-02T10:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'anxiety:1',
            sourceTimestamp: '2026-04-02T10:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'anxiety-episode',
            value: 7,
            payload: {
              kind: 'anxiety',
              intensity: 7,
              trigger: 'Cramped schedule',
              durationMinutes: 25,
            },
          },
        ],
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

  await page.goto('/today');
  await expect(page.getByText('Keep today lighter')).toBeVisible();
  await expect(
    page.getByText(/Meal fallback: keep the next meal familiar, easy, and protein-forward\./i)
  ).toBeVisible();
  await expect(page.getByText(/Recovery meal: Mystery soup\./i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Swap to recovery meal' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Swap to recovery walk' })).toBeVisible();
});

test('recovery meal swap clears stale notes from the replaced planned meal', async ({ page }) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: `daily:${localDay}`,
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            date: localDay,
            mood: 3,
            energy: 2,
            stress: 4,
            focus: 3,
            sleepHours: 5.5,
            sleepQuality: 2,
            freeformNote: 'Dragging today.',
          },
        ],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            name: 'Toast and jam',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 260,
            protein: 6,
            fiber: 2,
            carbs: 42,
            fat: 6,
          },
          {
            id: 'food-catalog-2',
            createdAt: '2026-04-02T08:05:00.000Z',
            updatedAt: '2026-04-02T08:05:00.000Z',
            name: 'Greek yogurt bowl',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 310,
            protein: 24,
            fiber: 6,
            carbs: 34,
            fat: 8,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-1',
            mealType: 'breakfast',
            title: 'Toast and jam',
            notes: 'Use the sourdough loaf before it goes stale.',
            status: 'planned',
            order: 0,
          },
        ],
        derivedGroceryItems: [],
        manualGroceryItems: [],
        workoutTemplates: [],
        exerciseCatalogItems: [],
        favoriteMeals: [],
        healthEvents: [
          {
            id: 'symptom-1',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:1',
            sourceTimestamp: '2026-04-02T09:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'symptom',
            value: 4,
            payload: {
              kind: 'symptom',
              symptom: 'Headache',
              severity: 4,
            },
          },
        ],
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

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  await expect(plannedMealSection).toContainText('Use the sourdough loaf before it goes stale.');

  await page.getByRole('button', { name: 'Swap to recovery meal' }).click();
  await expect(page.getByText(/Recovery meal applied\./i)).toBeVisible();
  await expect(plannedMealSection.getByText('Greek yogurt bowl')).toBeVisible();
  await expect(plannedMealSection).not.toContainText(
    'Use the sourdough loaf before it goes stale.'
  );
});

test('today prefers a later valid planned meal over an earlier stale slot', async ({ page }) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-2',
            createdAt: '2026-04-02T08:05:00.000Z',
            updatedAt: '2026-04-02T08:05:00.000Z',
            name: 'Greek yogurt bowl',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 310,
            protein: 24,
            fiber: 6,
            carbs: 34,
            fat: 8,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-stale',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-missing',
            mealType: 'breakfast',
            title: 'Missing breakfast',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-meal-valid',
            createdAt: '2026-04-02T08:10:00.000Z',
            updatedAt: '2026-04-02T08:10:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-2',
            mealType: 'lunch',
            title: 'Greek yogurt bowl',
            status: 'planned',
            order: 1,
          },
        ],
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

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });

  await expect(plannedMealSection.getByText('Greek yogurt bowl')).toBeVisible();
  await expect(plannedMealSection.getByText('Meal type: lunch')).toBeVisible();
  await expect(page.getByText('Planned meal unavailable.')).not.toBeVisible();

  await plannedMealSection.getByRole('button', { name: 'Log planned meal' }).click();
  await expect(page.getByText(/Planned meal logged\./i)).toBeVisible();

  const dailyBriefingSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Daily briefing' }),
  });
  await expect(dailyBriefingSection.locator('.summary-list')).toContainText('Meals logged: 1');
  await expect(page.getByText('Latest meal: Greek yogurt bowl')).toBeVisible();
});

test('nutrition still surfaces the valid planned meal when an earlier slot is stale', async ({
  page,
}) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-2',
            createdAt: '2026-04-02T08:05:00.000Z',
            updatedAt: '2026-04-02T08:05:00.000Z',
            name: 'Greek yogurt bowl',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 310,
            protein: 24,
            fiber: 6,
            carbs: 34,
            fat: 8,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-stale',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-missing',
            mealType: 'breakfast',
            title: 'Missing breakfast',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-meal-valid',
            createdAt: '2026-04-02T08:10:00.000Z',
            updatedAt: '2026-04-02T08:10:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-2',
            mealType: 'lunch',
            title: 'Greek yogurt bowl',
            status: 'planned',
            order: 1,
          },
        ],
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
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });

  await expect(plannedMealSection.getByText('Greek yogurt bowl')).toBeVisible();
  await expect(plannedMealSection.getByText('Meal type: lunch')).toBeVisible();
  await expect(page.getByText('Planned meal unavailable.')).not.toBeVisible();

  await plannedMealSection.getByRole('button', { name: 'Load into draft' }).click();
  await expect(page.getByLabel('Meal name')).toHaveValue('Greek yogurt bowl');
  await expect(page.getByLabel('Meal type')).toHaveValue('lunch');
});

test('recovery meal swap replaces the visible planned meal instead of mutating an earlier stale slot', async ({
  page,
}) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: `daily:${localDay}`,
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            date: localDay,
            mood: 3,
            energy: 2,
            stress: 4,
            focus: 3,
            sleepHours: 5.5,
            sleepQuality: 2,
            freeformNote: 'Dragging today.',
          },
        ],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            name: 'Toast and jam',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 260,
            protein: 6,
            fiber: 2,
            carbs: 42,
            fat: 6,
          },
          {
            id: 'food-catalog-2',
            createdAt: '2026-04-02T08:05:00.000Z',
            updatedAt: '2026-04-02T08:05:00.000Z',
            name: 'Greek yogurt bowl',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 310,
            protein: 24,
            fiber: 6,
            carbs: 34,
            fat: 8,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-stale',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-missing',
            mealType: 'breakfast',
            title: 'Missing breakfast',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-meal-valid',
            createdAt: '2026-04-02T08:10:00.000Z',
            updatedAt: '2026-04-02T08:10:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-1',
            mealType: 'lunch',
            title: 'Toast and jam',
            status: 'planned',
            order: 1,
          },
        ],
        derivedGroceryItems: [],
        manualGroceryItems: [],
        workoutTemplates: [],
        exerciseCatalogItems: [],
        favoriteMeals: [],
        healthEvents: [
          {
            id: 'symptom-1',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:1',
            sourceTimestamp: '2026-04-02T09:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'symptom',
            value: 4,
            payload: {
              kind: 'symptom',
              symptom: 'Headache',
              severity: 4,
            },
          },
        ],
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

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  const todayPlanSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: "Today's plan" }),
  });

  await expect(plannedMealSection.getByText('Toast and jam')).toBeVisible();

  await page.getByRole('button', { name: 'Swap to recovery meal' }).click();
  await expect(page.getByText(/Recovery meal applied\./i)).toBeVisible();
  await expect(plannedMealSection.getByText('Greek yogurt bowl')).toBeVisible();
  await expect(todayPlanSection).not.toContainText('Toast and jam');
});

test('today clear plan removes stale same-day meal slots alongside the visible handoff', async ({
  page,
}) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            name: 'Toast and jam',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 260,
            protein: 6,
            fiber: 2,
            carbs: 42,
            fat: 6,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-stale',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-missing',
            mealType: 'breakfast',
            title: 'Missing breakfast',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-meal-valid',
            createdAt: '2026-04-02T08:10:00.000Z',
            updatedAt: '2026-04-02T08:10:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-1',
            mealType: 'lunch',
            title: 'Toast and jam',
            status: 'planned',
            order: 1,
          },
        ],
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

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });

  await expect(plannedMealSection.getByText('Toast and jam')).toBeVisible();
  await plannedMealSection.getByRole('button', { name: 'Clear plan' }).click();

  await expect(page.getByText(/Planned meal cleared\./i)).toBeVisible();
  await expect(page.getByText('No meal queued up.')).toBeVisible();
  await expect(page.getByText('Planned meal unavailable.')).not.toBeVisible();
});

test('today logging a valid planned meal also clears stale sibling meal handoffs', async ({
  page,
}) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            name: 'Toast and jam',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 260,
            protein: 6,
            fiber: 2,
            carbs: 42,
            fat: 6,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-stale',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-missing',
            mealType: 'breakfast',
            title: 'Missing breakfast',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-meal-valid',
            createdAt: '2026-04-02T08:10:00.000Z',
            updatedAt: '2026-04-02T08:10:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-1',
            mealType: 'lunch',
            title: 'Toast and jam',
            status: 'planned',
            order: 1,
          },
        ],
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

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });

  await expect(plannedMealSection.getByText('Toast and jam')).toBeVisible();
  await plannedMealSection.getByRole('button', { name: 'Log planned meal' }).click();

  await expect(page.getByText(/Planned meal logged\./i)).toBeVisible();
  await expect(page.getByText('No meal queued up.')).toBeVisible();
  await expect(page.getByText('Planned meal unavailable.')).not.toBeVisible();
});

test('nutrition clear plan removes stale sibling meal handoffs too', async ({ page }) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            name: 'Toast and jam',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 260,
            protein: 6,
            fiber: 2,
            carbs: 42,
            fat: 6,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-stale',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-missing',
            mealType: 'breakfast',
            title: 'Missing breakfast',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-meal-valid',
            createdAt: '2026-04-02T08:10:00.000Z',
            updatedAt: '2026-04-02T08:10:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-1',
            mealType: 'lunch',
            title: 'Toast and jam',
            status: 'planned',
            order: 1,
          },
        ],
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
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });

  await expect(plannedMealSection.getByText('Toast and jam')).toBeVisible();
  await plannedMealSection.getByRole('button', { name: 'Clear plan' }).click();

  await expect(page.getByText(/Planned meal cleared\./i)).toBeVisible();
  await expect(page.getByText('Nothing planned yet.')).toBeVisible();
  await expect(page.getByText('Planned meal unavailable.')).not.toBeVisible();
});

test('recovery meal swap clears stale sibling meal slots too', async ({ page }) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: `daily:${localDay}`,
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            date: localDay,
            mood: 3,
            energy: 2,
            stress: 4,
            focus: 3,
            sleepHours: 5.5,
            sleepQuality: 2,
            freeformNote: 'Dragging today.',
          },
        ],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            name: 'Toast and jam',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 260,
            protein: 6,
            fiber: 2,
            carbs: 42,
            fat: 6,
          },
          {
            id: 'food-catalog-2',
            createdAt: '2026-04-02T08:05:00.000Z',
            updatedAt: '2026-04-02T08:05:00.000Z',
            name: 'Greek yogurt bowl',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 310,
            protein: 24,
            fiber: 6,
            carbs: 34,
            fat: 8,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-stale',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-missing',
            mealType: 'breakfast',
            title: 'Missing breakfast',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-meal-valid',
            createdAt: '2026-04-02T08:10:00.000Z',
            updatedAt: '2026-04-02T08:10:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-1',
            mealType: 'lunch',
            title: 'Toast and jam',
            status: 'planned',
            order: 1,
          },
        ],
        derivedGroceryItems: [],
        manualGroceryItems: [],
        workoutTemplates: [],
        exerciseCatalogItems: [],
        favoriteMeals: [],
        healthEvents: [
          {
            id: 'symptom-1',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:1',
            sourceTimestamp: '2026-04-02T09:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'symptom',
            value: 4,
            payload: {
              kind: 'symptom',
              symptom: 'Headache',
              severity: 4,
            },
          },
        ],
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

  await page.goto('/today');
  const todayPlanSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: "Today's plan" }),
  });

  await expect(todayPlanSection).toContainText('Missing breakfast');
  await page.getByRole('button', { name: 'Swap to recovery meal' }).click();

  await expect(page.getByText(/Recovery meal applied\./i)).toBeVisible();
  await expect(todayPlanSection).toContainText('Greek yogurt bowl');
  await expect(todayPlanSection).not.toContainText('Missing breakfast');
});

test('recovery workout swap targets the visible planned workout instead of an earlier stale slot', async ({
  page,
}) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: `daily:${localDay}`,
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            date: localDay,
            mood: 3,
            energy: 2,
            stress: 4,
            focus: 3,
            sleepHours: 5.5,
            sleepQuality: 2,
            freeformNote: 'Dragging today.',
          },
        ],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-workout-stale',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'workout',
            itemType: 'workout-template',
            itemId: 'template-missing',
            title: 'Missing workout',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-workout-valid',
            createdAt: '2026-04-02T08:10:00.000Z',
            updatedAt: '2026-04-02T08:10:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'workout',
            itemType: 'workout-template',
            itemId: 'template-1',
            title: 'Full body reset',
            status: 'planned',
            order: 1,
          },
        ],
        derivedGroceryItems: [],
        manualGroceryItems: [],
        workoutTemplates: [
          {
            id: 'template-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            title: 'Full body reset',
            goal: 'Recovery',
            exerciseRefs: [{ name: 'Goblet squat', reps: '8', sets: 3, restSeconds: 60 }],
          },
        ],
        exerciseCatalogItems: [],
        favoriteMeals: [],
        healthEvents: [
          {
            id: 'symptom-1',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:1',
            sourceTimestamp: '2026-04-02T09:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'symptom',
            value: 4,
            payload: {
              kind: 'symptom',
              symptom: 'Headache',
              severity: 4,
            },
          },
        ],
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

  await page.goto('/today');
  const plannedWorkoutSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned workout' }),
  });
  const todayPlanSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: "Today's plan" }),
  });

  await expect(plannedWorkoutSection.getByText('Full body reset')).toBeVisible();
  await page.getByRole('button', { name: 'Swap to recovery walk' }).click();

  await expect(page.getByText(/Recovery workout applied\./i)).toBeVisible();
  await expect(plannedWorkoutSection.getByText('Recovery walk')).toBeVisible();
  await expect(todayPlanSection).not.toContainText('Full body reset');
});

test('recovery workout swap clears stale sibling workout slots too', async ({ page }) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: `daily:${localDay}`,
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            date: localDay,
            mood: 3,
            energy: 2,
            stress: 4,
            focus: 3,
            sleepHours: 5.5,
            sleepQuality: 2,
            freeformNote: 'Dragging today.',
          },
        ],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-workout-stale',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'workout',
            itemType: 'workout-template',
            itemId: 'template-missing',
            title: 'Missing workout',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-workout-valid',
            createdAt: '2026-04-02T08:10:00.000Z',
            updatedAt: '2026-04-02T08:10:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'workout',
            itemType: 'workout-template',
            itemId: 'template-1',
            title: 'Full body reset',
            status: 'planned',
            order: 1,
          },
        ],
        derivedGroceryItems: [],
        manualGroceryItems: [],
        workoutTemplates: [
          {
            id: 'template-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            title: 'Full body reset',
            goal: 'Recovery',
            exerciseRefs: [{ name: 'Goblet squat', reps: '8', sets: 3, restSeconds: 60 }],
          },
        ],
        exerciseCatalogItems: [],
        favoriteMeals: [],
        healthEvents: [
          {
            id: 'symptom-1',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:1',
            sourceTimestamp: '2026-04-02T09:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'symptom',
            value: 4,
            payload: {
              kind: 'symptom',
              symptom: 'Headache',
              severity: 4,
            },
          },
        ],
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

  await page.goto('/today');
  const todayPlanSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: "Today's plan" }),
  });

  await expect(todayPlanSection).toContainText('Missing workout');
  await page.getByRole('button', { name: 'Swap to recovery walk' }).click();

  await expect(page.getByText(/Recovery workout applied\./i)).toBeVisible();
  await expect(todayPlanSection).toContainText('Recovery walk');
  await expect(todayPlanSection).not.toContainText('Missing workout');
});

test('marking the visible planned workout done clears stale sibling workout slots too', async ({
  page,
}) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: `daily:${localDay}`,
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            date: localDay,
            mood: 3,
            energy: 2,
            stress: 4,
            focus: 3,
            sleepHours: 5.5,
            sleepQuality: 2,
            freeformNote: 'Dragging today.',
          },
        ],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-workout-stale',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'workout',
            itemType: 'workout-template',
            itemId: 'template-missing',
            title: 'Missing workout',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-workout-valid',
            createdAt: '2026-04-02T08:10:00.000Z',
            updatedAt: '2026-04-02T08:10:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'workout',
            itemType: 'workout-template',
            itemId: 'template-1',
            title: 'Full body reset',
            status: 'planned',
            order: 1,
          },
        ],
        derivedGroceryItems: [],
        manualGroceryItems: [],
        workoutTemplates: [
          {
            id: 'template-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            title: 'Full body reset',
            goal: 'Recovery',
            exerciseRefs: [{ name: 'Goblet squat', reps: '8', sets: 3, restSeconds: 60 }],
          },
        ],
        exerciseCatalogItems: [],
        favoriteMeals: [],
        healthEvents: [
          {
            id: 'symptom-1',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:1',
            sourceTimestamp: '2026-04-02T09:00:00.000Z',
            localDay,
            timezone: 'UTC',
            confidence: 1,
            eventType: 'symptom',
            value: 4,
            payload: {
              kind: 'symptom',
              symptom: 'Headache',
              severity: 4,
            },
          },
        ],
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

  await page.goto('/today');
  const plannedWorkoutSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned workout' }),
  });
  const todayPlanSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: "Today's plan" }),
  });

  await expect(plannedWorkoutSection.getByText('Full body reset')).toBeVisible();
  await plannedWorkoutSection.getByRole('button', { name: 'Mark workout done' }).click();

  await expect(page.getByText(/Plan item marked done\./i)).toBeVisible();
  await expect(page.getByText('No workout lined up.')).toBeVisible();
  await expect(page.getByText('Planned workout unavailable.')).not.toBeVisible();
  await expect(todayPlanSection).not.toContainText('Missing workout');
});

test('marking the visible planned meal done clears stale sibling meal slots too', async ({
  page,
}) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            name: 'Toast and jam',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 260,
            protein: 6,
            fiber: 2,
            carbs: 42,
            fat: 6,
          },
        ],
        recipeCatalogItems: [],
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-stale',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-missing',
            mealType: 'breakfast',
            title: 'Missing breakfast',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-meal-valid',
            createdAt: '2026-04-02T08:10:00.000Z',
            updatedAt: '2026-04-02T08:10:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-1',
            mealType: 'lunch',
            title: 'Toast and jam',
            status: 'planned',
            order: 1,
          },
        ],
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

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });
  const todayPlanSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: "Today's plan" }),
  });

  await expect(plannedMealSection.getByText('Toast and jam')).toBeVisible();
  await todayPlanSection
    .locator('li')
    .filter({ hasText: 'Toast and jam' })
    .getByRole('button', { name: 'Done' })
    .click();

  await expect(page.getByText(/Plan item marked done\./i)).toBeVisible();
  await expect(page.getByText('No meal queued up.')).toBeVisible();
  await expect(page.getByText('Planned meal unavailable.')).not.toBeVisible();
  await expect(todayPlanSection).not.toContainText('Missing breakfast');
});

test('nutrition can load a planned recipe slot into the draft', async ({ page }) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

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
        weeklyPlans: [
          {
            id: 'weekly-plan-1',
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
            weekStart: localDay,
            title: `Week of ${localDay}`,
          },
        ],
        planSlots: [
          {
            id: 'slot-meal-recipe',
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'recipe',
            itemId: 'themealdb:52772',
            title: 'Teriyaki Chicken Casserole',
            status: 'planned',
            order: 0,
          },
        ],
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
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });

  await expect(plannedMealSection.getByText('Teriyaki Chicken Casserole')).toBeVisible();
  await expect(plannedMealSection.getByText(/Meal type: dinner/i)).toBeVisible();
  await plannedMealSection.getByRole('button', { name: 'Load into draft' }).click();

  await expect(page.getByLabel('Meal name')).toHaveValue('Teriyaki Chicken Casserole');
  await expect(page.getByLabel('Meal type')).toHaveValue('dinner');
  await expect(page.getByLabel('Calories')).toHaveValue('');
  await expect(page.getByLabel('Protein')).toHaveValue('');
  await expect(page.getByLabel('Fiber')).toHaveValue('');
  await expect(page.getByLabel('Carbs')).toHaveValue('');
  await expect(page.getByLabel('Fat')).toHaveValue('');
});

test('saving a recipe-loaded draft as a custom food does not fabricate zero macros', async ({
  page,
}) => {
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

  await page.goto('/nutrition');
  await page.getByLabel('Recipe search').fill('teriyaki');
  await page.getByRole('button', { name: 'Search recipes' }).click();
  await page
    .locator('.recipe-search li')
    .first()
    .getByRole('button', { name: 'Use recipe' })
    .click();

  await expect(page.getByLabel('Calories')).toHaveValue('');
  await page.getByRole('button', { name: 'Save as custom food' }).click();
  await expect(page.getByText(/Saved to custom food catalog\./i)).toBeVisible();

  const catalogSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Custom food catalog' }),
  });
  await expect(catalogSection.getByText('Teriyaki Chicken Casserole')).toBeVisible();
  await expect(catalogSection.getByText(/0 kcal/i)).toHaveCount(0);
  await expect(catalogSection.getByText(/0g protein/i)).toHaveCount(0);
  await expect(catalogSection.getByText(/0g fiber/i)).toHaveCount(0);
  await expect(catalogSection.getByText(/0g carbs/i)).toHaveCount(0);
  await expect(catalogSection.getByText(/0g fat/i)).toHaveCount(0);

  const recommendationsSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Recommended next' }),
  });
  const unknownFoodRecommendation = recommendationsSection.locator('li').filter({
    hasText: 'nutrition totals are still unknown, so treat this as a saved rotation idea.',
  });
  await expect(unknownFoodRecommendation.getByText('Teriyaki Chicken Casserole')).toBeVisible();
  await expect(
    unknownFoodRecommendation.getByText(
      /nutrition totals are still unknown, so treat this as a saved rotation idea\./i
    )
  ).toBeVisible();
  await expect(
    recommendationsSection.getByText(/saved food with decent baseline nutrition/i)
  ).toHaveCount(0);
  await expect(recommendationsSection.getByText(/good fit for a steadier-energy day/i)).toHaveCount(
    0
  );

  await page.getByLabel('Food search').fill('teriyaki');
  await page.getByRole('button', { name: 'Search foods' }).click();

  const mealLoggingSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Meal logging' }),
  });
  const localSearchResult = mealLoggingSection.locator('.match-list').first().locator('li').first();
  await expect(localSearchResult.getByText('Teriyaki Chicken Casserole')).toBeVisible();
  await expect(localSearchResult.getByText(/Nutrition totals unknown\./i)).toBeVisible();
  await expect(localSearchResult.getByText(/0 kcal/i)).toHaveCount(0);
  await expect(localSearchResult.getByText(/0g protein/i)).toHaveCount(0);

  await localSearchResult.getByRole('button', { name: 'Use match' }).click();
  await expect(page.getByLabel('Meal name')).toHaveValue('Teriyaki Chicken Casserole');
  await expect(page.getByLabel('Calories')).toHaveValue('');
  await expect(page.getByLabel('Protein')).toHaveValue('');
  await expect(page.getByLabel('Fiber')).toHaveValue('');
  await expect(page.getByLabel('Carbs')).toHaveValue('');
  await expect(page.getByLabel('Fat')).toHaveValue('');
});

test('saving a fresh name-only custom food does not fabricate zero macros', async ({ page }) => {
  await page.goto('/nutrition');

  await expect(page.getByLabel('Calories')).toHaveValue('');
  await expect(page.getByLabel('Protein')).toHaveValue('');
  await expect(page.getByLabel('Fiber')).toHaveValue('');
  await expect(page.getByLabel('Carbs')).toHaveValue('');
  await expect(page.getByLabel('Fat')).toHaveValue('');

  await page.getByLabel('Meal name').fill('Mystery soup');
  await page.getByRole('button', { name: 'Save as custom food' }).click();
  await expect(page.getByText(/Saved to custom food catalog\./i)).toBeVisible();

  const catalogSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Custom food catalog' }),
  });
  const savedItem = catalogSection.locator('li').filter({ hasText: 'Mystery soup' });
  await expect(savedItem.getByText('Mystery soup')).toBeVisible();
  await expect(savedItem.getByText(/Nutrition totals unknown\./i)).toBeVisible();
  await expect(savedItem.getByText(/0 kcal/i)).toHaveCount(0);
  await expect(savedItem.getByText(/0g protein/i)).toHaveCount(0);
  await expect(savedItem.getByText(/0g fiber/i)).toHaveCount(0);
  await expect(savedItem.getByText(/0g carbs/i)).toHaveCount(0);
  await expect(savedItem.getByText(/0g fat/i)).toHaveCount(0);
});

test('saving a fresh name-only meal keeps today summary totals unknown instead of zero', async ({
  page,
}) => {
  await page.goto('/nutrition');

  await expect(page.getByLabel('Calories')).toHaveValue('');
  await page.getByLabel('Meal name').fill('Mystery soup');
  await page.getByRole('button', { name: 'Save meal' }).click();
  await expect(page.getByText(/Meal saved\./i)).toBeVisible();

  const summarySection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Today summary' }),
  });
  await expect(summarySection.getByText('Mystery soup')).toBeVisible();
  await expect(summarySection.getByText('Calories: unknown')).toBeVisible();
  await expect(summarySection.getByText('Protein: unknown')).toBeVisible();
  await expect(summarySection.getByText('Fiber: unknown')).toBeVisible();
  await expect(summarySection.getByText('Carbs: unknown')).toBeVisible();
  await expect(summarySection.getByText('Fat: unknown')).toBeVisible();
  await expect(summarySection.getByText(/Calories: 0/i)).toHaveCount(0);
  await expect(summarySection.getByText(/Protein: 0/i)).toHaveCount(0);
});

test('today nutrition pulse stays unknown after logging a fresh name-only meal', async ({
  page,
}) => {
  await page.goto('/nutrition');

  await page.getByLabel('Meal name').fill('Name-only meal');
  await page.getByRole('button', { name: 'Save meal' }).click();
  await expect(page.getByText(/Meal saved\./i)).toBeVisible();

  await page.goto('/today');

  const nutritionPulseSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Nutrition pulse' }),
  });
  await expect(nutritionPulseSection.getByText('unknown / 80g')).toBeVisible();
  await expect(nutritionPulseSection.getByText('unknown / 25g')).toBeVisible();
  await expect(
    nutritionPulseSection.getByText(
      /logged meals are missing nutrition totals, so protein and fiber pace are still unknown/i
    )
  ).toBeVisible();
  await expect(nutritionPulseSection.getByText('Calories: unknown')).toBeVisible();
  await expect(nutritionPulseSection.getByText('Protein: unknown')).toBeVisible();
  await expect(nutritionPulseSection.getByText('Fiber: unknown')).toBeVisible();
  await expect(nutritionPulseSection.getByText('Carbs: unknown')).toBeVisible();
  await expect(nutritionPulseSection.getByText('Fat: unknown')).toBeVisible();
  await expect(nutritionPulseSection.getByText(/Protein is still low so far\./i)).toHaveCount(0);
  await expect(nutritionPulseSection.getByText(/Calories: 0/i)).toHaveCount(0);
  await expect(nutritionPulseSection.getByText(/Protein: 0/i)).toHaveCount(0);
});

test('today nutrition pulse stays precise when only some meal macros are missing', async ({
  page,
}) => {
  await page.goto('/nutrition');

  await page.getByLabel('Meal name').fill('Protein-only meal');
  await page.getByLabel('Protein').fill('24');
  await page.getByRole('button', { name: 'Save meal' }).click();
  await expect(page.getByText(/Meal saved\./i)).toBeVisible();

  await page.goto('/today');

  const nutritionPulseSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Nutrition pulse' }),
  });
  await expect(nutritionPulseSection.getByText('24 / 80g')).toBeVisible();
  await expect(nutritionPulseSection.getByText('unknown / 25g')).toBeVisible();
  await expect(nutritionPulseSection.getByText(/Protein is still low so far\./i)).toBeVisible();
  await expect(
    nutritionPulseSection.getByText(
      /Fiber pace is still unknown because one logged meal is missing nutrition totals\./i
    )
  ).toBeVisible();
  await expect(nutritionPulseSection.getByText('Protein: 24')).toBeVisible();
  await expect(nutritionPulseSection.getByText('Fiber: unknown')).toBeVisible();
  await expect(
    nutritionPulseSection.getByText(/protein and fiber pace are still unknown/i)
  ).toHaveCount(0);
});

test('today clear plan removes stale sibling recipe meal slots too', async ({ page }) => {
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [],
        journalEntries: [],
        foodEntries: [],
        foodCatalogItems: [
          {
            id: 'food-catalog-1',
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
            name: 'Greek yogurt bowl',
            sourceType: 'custom',
            sourceName: 'Local catalog',
            calories: 310,
            protein: 24,
            fiber: 6,
            carbs: 34,
            fat: 8,
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
        planSlots: [
          {
            id: 'slot-meal-stale-recipe',
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'recipe',
            itemId: 'recipe-missing',
            title: 'Missing recipe',
            status: 'planned',
            order: 0,
          },
          {
            id: 'slot-meal-valid',
            createdAt: '2026-04-03T00:10:00.000Z',
            updatedAt: '2026-04-03T00:10:00.000Z',
            weeklyPlanId: 'weekly-plan-1',
            localDay,
            slotType: 'meal',
            itemType: 'food',
            itemId: 'food-catalog-1',
            mealType: 'lunch',
            title: 'Greek yogurt bowl',
            status: 'planned',
            order: 1,
          },
        ],
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

  await page.goto('/today');
  const plannedMealSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned next meal' }),
  });

  await expect(plannedMealSection.getByText('Greek yogurt bowl')).toBeVisible();
  await plannedMealSection.getByRole('button', { name: 'Clear plan' }).click();

  await expect(page.getByText(/Planned meal cleared\./i)).toBeVisible();
  await expect(page.getByText('No meal queued up.')).toBeVisible();
  await expect(page.getByText('Planned meal unavailable.')).not.toBeVisible();
});
