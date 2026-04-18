import { expect, test } from '@playwright/test';
import { postMigrationSnapshot, resetDb } from '../../support/e2e/http';

test.beforeEach(async ({ page }) => {
  const response = await resetDb(page.request);
  expect(response.ok()).toBe(true);
});

test('weekly review surfaces journal context signals', async ({ page }) => {
  const seedResponse = await postMigrationSnapshot(page.request, {
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
  const contextSection = page
    .getByRole('heading', { name: 'Context signals' })
    .locator('xpath=ancestor::section[1]');
  const journalSection = page
    .getByRole('heading', { name: 'Journal excerpts' })
    .locator('xpath=ancestor::section[1]');
  await expect(
    contextSection.getByText(/^Low sleep and a written reflection both landed on 2026-03-31\.$/)
  ).toBeVisible();
  await expect(
    journalSection.getByText(
      /^Evening review on 2026-03-31: Crowded store and headache drained the afternoon\.$/
    )
  ).toBeVisible();
});

test('weekly review surfaces repeated context patterns', async ({ page }) => {
  const seedResponse = await postMigrationSnapshot(page.request, {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: 'daily:2026-03-30',
            createdAt: '2026-03-30T08:00:00.000Z',
            updatedAt: '2026-03-30T08:00:00.000Z',
            date: '2026-03-30',
            mood: 3,
            energy: 2,
            stress: 3,
            focus: 3,
            sleepHours: 6,
            sleepQuality: 3,
          },
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
        ],
        journalEntries: [
          {
            id: 'journal-1',
            createdAt: '2026-03-30T21:00:00.000Z',
            updatedAt: '2026-03-30T21:00:00.000Z',
            localDay: '2026-03-30',
            entryType: 'symptom_note',
            title: 'Headache note',
            body: 'Headache and worry hit after lunch.',
            tags: [],
            linkedEventIds: ['symptom-1', 'anxiety-1'],
          },
          {
            id: 'journal-2',
            createdAt: '2026-03-31T21:00:00.000Z',
            updatedAt: '2026-03-31T21:00:00.000Z',
            localDay: '2026-03-31',
            entryType: 'symptom_note',
            title: 'Headache note',
            body: 'Headache and worry hit again after errands.',
            tags: [],
            linkedEventIds: ['symptom-2', 'anxiety-2'],
          },
        ],
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
            createdAt: '2026-03-30T09:00:00.000Z',
            updatedAt: '2026-03-30T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:1',
            sourceTimestamp: '2026-03-30T09:00:00.000Z',
            localDay: '2026-03-30',
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
            id: 'symptom-2',
            createdAt: '2026-03-31T09:00:00.000Z',
            updatedAt: '2026-03-31T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'symptom:2',
            sourceTimestamp: '2026-03-31T09:00:00.000Z',
            localDay: '2026-03-31',
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
            createdAt: '2026-03-30T14:00:00.000Z',
            updatedAt: '2026-03-30T14:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'anxiety:1',
            sourceTimestamp: '2026-03-30T14:00:00.000Z',
            localDay: '2026-03-30',
            timezone: 'UTC',
            confidence: 1,
            eventType: 'anxiety-episode',
            value: 6,
            payload: {
              kind: 'anxiety',
              intensity: 6,
              trigger: 'Crowded store',
            },
          },
          {
            id: 'anxiety-2',
            createdAt: '2026-03-31T14:00:00.000Z',
            updatedAt: '2026-03-31T14:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'anxiety:2',
            sourceTimestamp: '2026-03-31T14:00:00.000Z',
            localDay: '2026-03-31',
            timezone: 'UTC',
            confidence: 1,
            eventType: 'anxiety-episode',
            value: 6,
            payload: {
              kind: 'anxiety',
              intensity: 6,
              trigger: 'Cramped schedule',
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
  await expect(page.getByText('Patterns to watch')).toBeVisible();
  await expect(
    page.getByText('Headache kept showing up in your notes on 2 days this week.')
  ).toBeVisible();
  await expect(
    page.getByText('Anxiety-related context showed up in your notes on 2 days this week.')
  ).toBeVisible();
});

test('weekly review keeps ranked experiment candidate ids stable after saving a different choice', async ({
  page,
}) => {
  const seedResponse = await postMigrationSnapshot(page.request, {
    data: {
      snapshot: {
        dailyRecords: [
          {
            id: 'daily:2026-04-02',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            date: '2026-04-02',
            mood: 3,
            energy: 2,
            stress: 4,
            focus: 2,
            sleepHours: 5.5,
            sleepQuality: 2,
          },
        ],
        journalEntries: [
          {
            id: 'journal-1',
            createdAt: '2026-04-02T21:00:00.000Z',
            updatedAt: '2026-04-02T21:00:00.000Z',
            localDay: '2026-04-02',
            entryType: 'evening_review',
            title: 'Rough afternoon',
            body: 'Crowded store and headache drained the afternoon.',
            tags: [],
            linkedEventIds: [],
          },
        ],
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
            createdAt: '2026-04-02T14:00:00.000Z',
            updatedAt: '2026-04-02T14:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            sourceRecordId: 'anxiety:1',
            sourceTimestamp: '2026-04-02T14:00:00.000Z',
            localDay: '2026-04-02',
            timezone: 'UTC',
            confidence: 1,
            eventType: 'anxiety-episode',
            value: 4,
            payload: {
              kind: 'anxiety',
              intensity: 4,
              trigger: 'Crowded store',
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
  const experimentSelect = page.getByLabel('Next-week experiment');
  await expect(experimentSelect).toBeVisible();
  await expect(experimentSelect).toHaveValue('mindfulness-10min-morning');
  await expect(experimentSelect.locator('option')).toHaveText([
    'Try 10 min morning mindfulness',
    'Increase protein at breakfast',
    'Increase hydration tracking',
  ]);
  await expect(
    experimentSelect
      .locator('option')
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value))
  ).resolves.toEqual(['mindfulness-10min-morning', 'protein-breakfast', 'hydration-tracking']);

  await experimentSelect.selectOption('hydration-tracking');
  await page.getByRole('button', { name: 'Save experiment' }).click();
  await expect(page.getByText('Experiment saved.')).toBeVisible();
  await expect(
    page.getByText('Saved experiment: Increase hydration tracking', { exact: true })
  ).toBeVisible();

  await page.reload();
  await expect(experimentSelect).toBeVisible();
  await expect(experimentSelect).toHaveValue('hydration-tracking');
  await expect(
    page.getByText('Saved experiment: Increase hydration tracking', { exact: true })
  ).toBeVisible();
  await expect(page.getByText(/Current verdict on saved experiment/i)).toBeVisible();
  await expect(experimentSelect.locator('option')).toHaveText([
    'Try 10 min morning mindfulness',
    'Increase protein at breakfast',
    'Increase hydration tracking',
  ]);
  await expect(
    experimentSelect
      .locator('option')
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value))
  ).resolves.toEqual(['mindfulness-10min-morning', 'protein-breakfast', 'hydration-tracking']);
});
