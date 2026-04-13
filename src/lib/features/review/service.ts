import type {
  HealthDbAdherenceMatchesStore,
  HealthDbAssessmentResultsStore,
  HealthDbDailyRecordsStore,
  HealthDbDerivedGroceryItemsStore,
  HealthDbFoodCatalogItemsStore,
  HealthDbFoodEntriesStore,
  HealthDbHealthEventsStore,
  HealthDbJournalEntriesStore,
  HealthDbManualGroceryItemsStore,
  HealthDbPlanSlotsStore,
  HealthDbRecipeCatalogItemsStore,
  HealthDbReviewSnapshotsStore,
  HealthDbSobrietyEventsStore,
  HealthDbWeeklyPlansStore,
} from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type { ReviewSnapshot } from '$lib/core/domain/types';
import { startOfWeek } from '$lib/core/shared/dates';
import { updateRecordMeta } from '$lib/core/shared/records';
import { computeWeekAdherenceMatches } from '$lib/features/adherence/matching';
import { deriveWeeklyGroceriesFromData } from '$lib/features/groceries/derivation';
import { computeTrendComparisonsFromData, type WeeklyReviewData } from './analytics';
import {
  listAdherenceMatchesForWeek,
  listDerivedGroceriesForPlan,
  listManualGroceriesForPlan,
  persistAdherenceMatches,
  persistDerivedGroceries,
  persistReviewSnapshot,
} from './artifact-persistence';
import {
  buildWeeklySnapshotFromWeekData,
  resolveReviewAnchorDayFromSourceData,
  selectReviewWeekData,
  type ReviewSourceData,
} from './snapshot-builder';

export type { ReviewCorrelation, WeeklyReviewData } from './analytics';
export {
  buildWeeklySnapshotFromWeekData,
  resolveReviewAnchorDayFromSourceData,
  selectReviewWeekData,
  type ReviewSourceData,
  type ReviewWeekData,
} from './snapshot-builder';
export { computeCorrelations, generateReviewFlags } from './analytics';

export interface ReviewStorage
  extends
    HealthDbDailyRecordsStore,
    HealthDbFoodEntriesStore,
    HealthDbSobrietyEventsStore,
    HealthDbAssessmentResultsStore,
    HealthDbHealthEventsStore,
    HealthDbJournalEntriesStore,
    HealthDbFoodCatalogItemsStore,
    HealthDbRecipeCatalogItemsStore,
    HealthDbWeeklyPlansStore,
    HealthDbPlanSlotsStore,
    HealthDbDerivedGroceryItemsStore,
    HealthDbManualGroceryItemsStore,
    HealthDbReviewSnapshotsStore,
    HealthDbAdherenceMatchesStore {}

async function loadReviewSourceData(store: ReviewStorage): Promise<ReviewSourceData> {
  const [
    dailyRecords,
    foodEntries,
    sobrietyEvents,
    assessments,
    healthEvents,
    journalEntries,
    foodCatalogItems,
    recipeCatalogItems,
    weeklyPlans,
    planSlots,
  ] = await Promise.all([
    store.dailyRecords.toArray(),
    store.foodEntries.toArray(),
    store.sobrietyEvents.toArray(),
    store.assessmentResults.toArray(),
    store.healthEvents.toArray(),
    store.journalEntries.toArray(),
    store.foodCatalogItems.toArray(),
    store.recipeCatalogItems.toArray(),
    store.weeklyPlans.toArray(),
    store.planSlots.toArray(),
  ]);

  return {
    dailyRecords,
    foodEntries,
    sobrietyEvents,
    assessments,
    healthEvents,
    journalEntries,
    foodCatalogItems,
    recipeCatalogItems,
    weeklyPlans,
    planSlots,
  };
}

export async function resolveReviewAnchorDay(
  store: ReviewStorage,
  requestedAnchorDay: string
): Promise<string> {
  return resolveReviewAnchorDayFromSourceData(
    await loadReviewSourceData(store),
    requestedAnchorDay
  );
}

export async function computeTrendComparisons(
  store: ReviewStorage,
  anchorDay: string
): Promise<{
  weekStart: string;
  daysTracked: number;
  averageMood: number;
  averageSleep: number;
  averageProtein: number;
}> {
  const weekData = selectReviewWeekData(await loadReviewSourceData(store), anchorDay);
  return computeTrendComparisonsFromData(
    weekData.weekStart,
    weekData.weekRecords,
    weekData.weekFood
  );
}

export async function buildWeeklySnapshot(
  store: ReviewStorage,
  anchorDay: string
): Promise<WeeklyReviewData> {
  const weekData = selectReviewWeekData(await loadReviewSourceData(store), anchorDay);
  const [existingSnapshot, existingAdherenceMatches, existingDerivedItems, manualItems] =
    await Promise.all([
      store.reviewSnapshots.get(`review:${weekData.weekStart}`),
      listAdherenceMatchesForWeek(store, weekData.weekStart),
      weekData.weeklyPlan
        ? listDerivedGroceriesForPlan(store, weekData.weeklyPlan.id)
        : Promise.resolve([]),
      weekData.weeklyPlan
        ? listManualGroceriesForPlan(store, weekData.weeklyPlan.id)
        : Promise.resolve([]),
    ]);

  const groceryResult = weekData.weeklyPlan
    ? deriveWeeklyGroceriesFromData({
        weeklyPlanId: weekData.weeklyPlan.id,
        slots: weekData.weekPlanSlots,
        recipes: weekData.recipeCatalogItems,
        existingDerivedItems,
        manualItems,
      })
    : { derivedItems: [], items: [], warnings: [] };
  const adherenceComputation = computeWeekAdherenceMatches({
    existingMatches: existingAdherenceMatches,
    weekStart: weekData.weekStart,
    planSlots: weekData.weekPlanSlots,
    foodEntries: weekData.weekFood,
    anchorDay,
  });

  if (!adherenceComputation.reusedExisting) {
    await persistAdherenceMatches(store, adherenceComputation.matches, existingAdherenceMatches);
  }

  if (weekData.weeklyPlan) {
    await persistDerivedGroceries(store, groceryResult.derivedItems, existingDerivedItems);
  }

  return buildWeeklySnapshotFromWeekData({
    weekData,
    existingSnapshot: existingSnapshot ?? undefined,
    weekGroceries: groceryResult.items,
    adherenceMatches: adherenceComputation.matches,
  });
}

export async function saveNextWeekExperiment(
  store: ReviewStorage,
  anchorDay: string,
  experiment: string,
  experimentId?: string
): Promise<ReviewSnapshot> {
  const weekly = await buildWeeklySnapshot(store, anchorDay);
  const timestamp = nowIso();

  const snapshot: ReviewSnapshot = {
    ...weekly.snapshot,
    ...updateRecordMeta(weekly.snapshot, weekly.snapshot.id, timestamp),
    experimentId,
    experiment,
  };

  return (await persistReviewSnapshot(store, weekly, snapshot)).snapshot;
}

export async function refreshWeeklyReviewArtifacts(
  store: ReviewStorage,
  anchorDay: string
): Promise<WeeklyReviewData> {
  const weekly = await buildWeeklySnapshot(store, anchorDay);
  return await persistReviewSnapshot(store, weekly);
}

function isDatabaseClosedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'DatabaseClosedError' || /database has been closed/i.test(error.message))
  );
}

export async function refreshWeeklyReviewArtifactsSafely(
  store: ReviewStorage,
  anchorDay: string
): Promise<void> {
  try {
    await refreshWeeklyReviewArtifacts(store, anchorDay);
  } catch (error) {
    if (!isDatabaseClosedError(error)) {
      throw error;
    }
  }
}

export async function refreshWeeklyReviewArtifactsForDaysSafely(
  store: ReviewStorage,
  anchorDays: string[]
): Promise<void> {
  const refreshedWeeks = new Set<string>();

  for (const anchorDay of anchorDays) {
    if (!anchorDay) {
      continue;
    }

    const weekStart = startOfWeek(anchorDay);
    if (refreshedWeeks.has(weekStart)) {
      continue;
    }
    refreshedWeeks.add(weekStart);

    await refreshWeeklyReviewArtifactsSafely(store, anchorDay);
  }
}
