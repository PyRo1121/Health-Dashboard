import { describe, expect, it } from 'vitest';
import { saveAssessmentProgress } from '$lib/features/assessments/service';
import { logAnxietyEvent } from '$lib/features/health/service';
import { loadHealthPage } from '$lib/features/health/state';
import { commitImportBatch, previewImport } from '$lib/features/imports/store';
import { previewImportsPage, commitImportsPage } from '$lib/features/imports/page-actions';
import { createImportsPageState } from '$lib/features/imports/page-state';
import { analyzeImportPayload } from '$lib/features/imports/analyze';
import { saveJournalEntry } from '$lib/features/journal/service';
import { createFoodEntry, saveFoodCatalogItem, upsertRecipeCatalogItem } from '$lib/features/nutrition/store';
import { ensureWeeklyPlan, savePlanSlot, updatePlanSlotStatus } from '$lib/features/planning/service';
import { loadReviewPage } from '$lib/features/review/controller';
import { setSobrietyStatusForDay } from '$lib/features/sobriety/service';
import { createTimelinePageState, loadTimelinePage } from '$lib/features/timeline/controller';
import { saveDailyCheckin } from '$lib/features/today/actions';
import { loadTodayPage } from '$lib/features/today/controller';
import { HEALTHKIT_BUNDLE_JSON } from '../../../support/fixtures/healthkit-bundle';
import {
  SMART_FHIR_BUNDLE_JSON,
  SMART_FHIR_BUNDLE_MISMATCH_JSON,
} from '../../../support/fixtures/smart-fhir-bundle';
import { useTestHealthDb } from '../../../support/unit/testDb';
import type { InMemoryTestHealthRuntime } from '$lib/core/db/test-client';

const OWNER_PROFILE = {
  fullName: 'Pyro Example',
  birthDate: '1990-01-01',
} as const;

function stripKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripKeys);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) =>
        ![
          'id',
          'createdAt',
          'updatedAt',
          'sourceRecordId',
          'sourceTimestamp',
          'fingerprint',
          'batchId',
          'planSlotId',
          'matchedRecordId',
          'recommendationId',
          'contextCaptureLinkedEventIds',
          'journalReflectionLinkedEventIds',
        ].includes(key)
      )
      .map(([key, nested]) => [key, stripKeys(nested)]);

    return Object.fromEntries(entries);
  }

  return value;
}

async function seedGoldenDataset(db: InMemoryTestHealthRuntime) {
  await saveDailyCheckin(db, {
    date: '2026-03-31',
    mood: 3,
    energy: 2,
    stress: 3,
    focus: 3,
    sleepHours: 6,
    sleepQuality: 3,
  });
  await saveDailyCheckin(db, {
    date: '2026-04-02',
    mood: 5,
    energy: 4,
    stress: 2,
    focus: 4,
    sleepHours: 8,
    sleepQuality: 4,
  });
  await createFoodEntry(db, {
    localDay: '2026-03-31',
    mealType: 'breakfast',
    name: 'Oatmeal',
    calories: 320,
    protein: 25,
    fiber: 8,
  });
  await createFoodEntry(db, {
    localDay: '2026-04-02',
    mealType: 'breakfast',
    name: 'Protein breakfast',
    calories: 420,
    protein: 90,
    fiber: 7,
    carbs: 32,
    fat: 12,
  });
  await saveFoodCatalogItem(db, {
    name: 'Greek yogurt bowl',
    calories: 310,
    protein: 24,
    fiber: 6,
    carbs: 34,
    fat: 8,
  });
  await upsertRecipeCatalogItem(db, {
    id: 'themealdb:52772',
    createdAt: '2026-04-02T08:00:00.000Z',
    updatedAt: '2026-04-02T08:00:00.000Z',
    title: 'Teriyaki Chicken Casserole',
    sourceType: 'themealdb',
    sourceName: 'TheMealDB',
    externalId: '52772',
    mealType: 'dinner',
    cuisine: 'Japanese',
    ingredients: ['3/4 cup soy sauce', '2 chicken breast'],
    instructions: 'Bake until cooked through.',
  });
  const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-02');
  const mealSlot = await savePlanSlot(db, {
    weeklyPlanId: weeklyPlan.id,
    localDay: '2026-04-02',
    slotType: 'meal',
    itemType: 'recipe',
    itemId: 'themealdb:52772',
    title: 'Teriyaki Chicken Casserole',
  });
  await savePlanSlot(db, {
    weeklyPlanId: weeklyPlan.id,
    localDay: '2026-04-03',
    slotType: 'workout',
    itemType: 'freeform',
    title: 'Recovery walk',
  });
  await updatePlanSlotStatus(db, mealSlot.id, 'done');
  await setSobrietyStatusForDay(db, { localDay: '2026-04-02', status: 'sober' });
  await saveAssessmentProgress(db, {
    localDay: '2026-04-02',
    instrument: 'WHO-5',
    itemResponses: [3, 3, 3],
  });
  await logAnxietyEvent(db, {
    localDay: '2026-03-31',
    intensity: 4,
    trigger: 'Crowded store',
    durationMinutes: 20,
    note: 'Walked it off',
  });
  await saveJournalEntry(db, {
    localDay: '2026-03-31',
    entryType: 'evening_review',
    title: 'Rough afternoon',
    body: 'Crowded store and headache drained the afternoon.',
    tags: [],
    linkedEventIds: [],
  });

  const batch = await previewImport(db, {
    sourceType: 'healthkit-companion',
    rawText: HEALTHKIT_BUNDLE_JSON,
  });
  await commitImportBatch(db, batch.id);
}

describe('migration golden parity', () => {
  const getDb = useTestHealthDb();

  it('matches current page-state outputs for seeded health, timeline, review, and today flows', async () => {
    const db = getDb();
    await seedGoldenDataset(db);

    const today = await loadTodayPage(db, '2026-04-02');
    const timeline = await loadTimelinePage(db, createTimelinePageState());
    const review = await loadReviewPage(db, '2026-04-02');
    const health = await loadHealthPage(db, '2026-04-02');

    const golden = stripKeys({
      today,
      timeline: timeline.items.map((item) => ({
        localDay: item.event.localDay,
        eventType: item.event.eventType,
        sourceType: item.event.sourceType,
        label: item.label,
        valueLabel: item.valueLabel,
        sourceLabel: item.sourceLabel,
      })),
      review,
      health,
    });

    expect(golden).toMatchSnapshot();
  });

  it('matches current import page-state behavior for preview and commit', async () => {
    const db = getDb();

    const previewed = await previewImportsPage(createImportsPageState('healthkit-companion'), {
      getOwnerProfile: () => OWNER_PROFILE,
      previewImport: (input) => previewImport(db, input),
    });

    const committed = await commitImportsPage(previewed, {
      commitImportBatch: (batchId) => commitImportBatch(db, batchId),
    });

    const golden = stripKeys({
      previewed,
      committed,
    });

    expect(golden).toMatchSnapshot();
  });

  it('keeps SMART clinical import gates stable', async () => {
    const db = getDb();

    await expect(
      previewImport(db, {
        sourceType: 'smart-fhir-sandbox',
        rawText: SMART_FHIR_BUNDLE_JSON,
      })
    ).rejects.toThrow('Configure your owner profile in Settings before previewing SMART clinical imports.');

    await expect(
      previewImport(db, {
        sourceType: 'smart-fhir-sandbox',
        rawText: SMART_FHIR_BUNDLE_MISMATCH_JSON,
        ownerProfile: OWNER_PROFILE,
      })
    ).rejects.toThrow('No verified local person match found. Keep the record source-scoped and blocked.');
  });

  it('keeps import payload analysis stable for the current healthkit bundle', () => {
    const summary = analyzeImportPayload(HEALTHKIT_BUNDLE_JSON);
    expect(stripKeys(summary)).toMatchSnapshot();
  });
});
