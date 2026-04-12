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
  await expect(page.getByText(/Craving logged\./i)).toBeVisible();
  await page.getByLabel('Lapse note').fill('Had a lapse after a rough evening.');
  await page.getByLabel('Recovery action').fill('Text sponsor');
  await page.getByRole('button', { name: 'Log lapse context' }).click();
  await expect(page.getByText(/Lapse context logged\./i)).toBeVisible();

  await expect(page.getByText(/Current streak: 1 day/i)).toBeVisible();
  await expect(page.locator('.event-list')).toContainText('Stress spike after lunch.');
  await expect(page.locator('.event-list')).toContainText('Text sponsor');
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
});

test('weekly review surfaces journal context signals', async ({ page }) => {
  const seedResponse = await page.request.post('/api/db/migrate', {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: 'daily:2026-03-31',
            createdAt: '2026-03-31T08:00:00.000Z',
            updatedAt: '2026-03-31T08:00:00.000Z',
            date: '2026-03-31',
            mood: 3,
            energy: 2,
            stress: 3,
            focus: 3,
            sleepHours: 6,
            sleepQuality: 3,
          },
          {
            id: 'daily:2026-04-02',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            date: '2026-04-02',
            mood: 5,
            energy: 4,
            stress: 2,
            focus: 4,
            sleepHours: 8,
            sleepQuality: 4,
          },
        ],
        journalEntries: [
          {
            id: 'journal-1',
            createdAt: '2026-03-31T21:00:00.000Z',
            updatedAt: '2026-03-31T21:00:00.000Z',
            localDay: '2026-03-31',
            entryType: 'evening_review',
            title: 'Rough afternoon',
            body: 'Crowded store and headache drained the afternoon.',
            tags: [],
            linkedEventIds: [],
          },
        ],
        foodEntries: [
          {
            id: 'food-entry-1',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
            localDay: '2026-04-02',
            mealType: 'breakfast',
            name: 'Protein breakfast',
            calories: 420,
            protein: 90,
            fiber: 7,
            carbs: 32,
            fat: 12,
          },
        ],
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
            createdAt: '2026-03-31T14:00:00.000Z',
            updatedAt: '2026-03-31T14:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'anxiety:1',
            sourceTimestamp: '2026-03-31T14:00:00.000Z',
            localDay: '2026-03-31',
            timezone: 'UTC',
            confidence: 1,
            eventType: 'anxiety-episode',
            value: 4,
            payload: {
              kind: 'anxiety',
              intensity: 4,
              trigger: 'Crowded store',
              durationMinutes: 20,
              note: 'Walked it off',
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

  await page.goto('/review');
  await expect(page.getByText('Context signals')).toBeVisible();
  await expect(page.getByText('Journal excerpts')).toBeVisible();
  await expect(
    page.getByText('Low sleep and a written reflection both landed on 2026-03-31.')
  ).toBeVisible();
  await expect(
    page.getByText(
      'Evening review on 2026-03-31: Crowded store and headache drained the afternoon.'
    )
  ).toBeVisible();
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
  await expect(page.getByText('Protein pace')).toBeVisible();
  await page.getByRole('button', { name: 'Log planned meal' }).click();
  await expect(page.getByText(/Planned meal logged\./i)).toBeVisible();

  const dailyBriefingSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Daily briefing' }),
  });
  await expect(dailyBriefingSection.locator('.summary-list')).toContainText('Meals logged: 1');
  await expect(page.getByText('Calories: 320')).toBeVisible();
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
  await expect(page.getByText('Sleep landed under 6 hours.', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Meal fallback: keep the next meal familiar, easy, and protein-forward.')
  ).toBeVisible();
  await expect(
    page.getByText(
      'Workout fallback: downgrade Full body reset to a short walk, mobility reset, or full rest.'
    )
  ).toBeVisible();
  await expect(page.getByText(/Meal fallback: keep the next meal familiar, easy, and protein-forward\./i)).toBeVisible();
  await expect(page.getByText(/Workout fallback: downgrade Full body reset to a short walk, mobility reset, or full rest\./i)).toBeVisible();
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
