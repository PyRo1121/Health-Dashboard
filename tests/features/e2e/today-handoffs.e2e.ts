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
