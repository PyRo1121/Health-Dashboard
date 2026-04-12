import { nowIso } from '$lib/core/domain/time';
import type {
  AdherenceMatch,
  AssessmentResult,
  DailyRecord,
  DerivedGroceryItem,
  FoodCatalogItem,
  FoodEntry,
  HealthEvent,
  JournalEntry,
  ManualGroceryItem,
  PlanSlot,
  RecipeCatalogItem,
  ReviewSnapshot,
  SobrietyEvent,
  WeeklyPlan,
} from '$lib/core/domain/types';
import { startOfWeek } from '$lib/core/shared/dates';
import { updateRecordMeta } from '$lib/core/shared/records';
import { computeWeekAdherenceMatches } from '$lib/features/adherence/matching';
import { deriveWeeklyGroceriesFromData } from '$lib/features/groceries/derivation';
import type { ReviewPageState } from '$lib/features/review/controller';
import {
  buildWeeklySnapshotFromWeekData,
  resolveReviewAnchorDayFromSourceData,
  selectReviewWeekData,
  type ReviewSourceData,
  type WeeklyReviewData,
} from '$lib/features/review/service';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import {
  selectAllMirrorRecords,
  selectMirrorRecordById,
  selectMirrorRecordsByField,
  upsertMirrorRecord,
} from '$lib/server/db/drizzle/mirror';

async function loadReviewSourceData(): Promise<ReviewSourceData> {
  const { db } = getServerDrizzleClient();
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
    selectAllMirrorRecords<DailyRecord>(db, drizzleSchema.dailyRecords),
    selectAllMirrorRecords<FoodEntry>(db, drizzleSchema.foodEntries),
    selectAllMirrorRecords<SobrietyEvent>(db, drizzleSchema.sobrietyEvents),
    selectAllMirrorRecords<AssessmentResult>(db, drizzleSchema.assessmentResults),
    selectAllMirrorRecords<HealthEvent>(db, drizzleSchema.healthEvents),
    selectAllMirrorRecords<JournalEntry>(db, drizzleSchema.journalEntries),
    selectAllMirrorRecords<FoodCatalogItem>(db, drizzleSchema.foodCatalogItems),
    selectAllMirrorRecords<RecipeCatalogItem>(db, drizzleSchema.recipeCatalogItems),
    selectAllMirrorRecords<WeeklyPlan>(db, drizzleSchema.weeklyPlans),
    selectAllMirrorRecords<PlanSlot>(db, drizzleSchema.planSlots),
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

export async function resolveReviewAnchorDayServer(requestedAnchorDay: string): Promise<string> {
  return resolveReviewAnchorDayFromSourceData(await loadReviewSourceData(), requestedAnchorDay);
}

export async function buildWeeklySnapshotServer(anchorDay: string): Promise<WeeklyReviewData> {
  const sourceData = await loadReviewSourceData();
  const resolvedAnchorDay = resolveReviewAnchorDayFromSourceData(sourceData, anchorDay);
  const weekData = selectReviewWeekData(sourceData, resolvedAnchorDay);
  const { db } = getServerDrizzleClient();
  const [existingSnapshot, existingAdherenceMatches, existingDerivedGroceries, manualGroceries] =
    await Promise.all([
      selectMirrorRecordById<ReviewSnapshot>(
        db,
        drizzleSchema.reviewSnapshots,
        `review:${weekData.weekStart}`
      ),
      selectMirrorRecordsByField<AdherenceMatch>(
        db,
        drizzleSchema.adherenceMatches,
        'weekStart',
        weekData.weekStart
      ),
      weekData.weeklyPlan
        ? selectMirrorRecordsByField<DerivedGroceryItem>(
            db,
            drizzleSchema.derivedGroceryItems,
            'weeklyPlanId',
            weekData.weeklyPlan.id
          )
        : Promise.resolve([]),
      weekData.weeklyPlan
        ? selectMirrorRecordsByField<ManualGroceryItem>(
            db,
            drizzleSchema.manualGroceryItems,
            'weeklyPlanId',
            weekData.weeklyPlan.id
          )
        : Promise.resolve([]),
    ]);

  const groceryResult = weekData.weeklyPlan
    ? deriveWeeklyGroceriesFromData({
        weeklyPlanId: weekData.weeklyPlan.id,
        slots: weekData.weekPlanSlots,
        recipes: weekData.recipeCatalogItems,
        existingDerivedItems: existingDerivedGroceries,
        manualItems: manualGroceries,
      })
    : { derivedItems: [], items: [], warnings: [] };
  const adherenceMatches = computeWeekAdherenceMatches({
    existingMatches: existingAdherenceMatches,
    weekStart: weekData.weekStart,
    planSlots: weekData.weekPlanSlots,
    foodEntries: weekData.weekFood,
    anchorDay: resolvedAnchorDay,
  }).matches;

  return buildWeeklySnapshotFromWeekData({
    weekData,
    existingSnapshot: existingSnapshot ?? undefined,
    weekGroceries: groceryResult.items,
    adherenceMatches,
  });
}

async function persistReviewSnapshotServer(snapshot: ReviewSnapshot): Promise<void> {
  const { db } = getServerDrizzleClient();
  await upsertMirrorRecord(db, 'reviewSnapshots', drizzleSchema.reviewSnapshots, snapshot);
}

async function persistWeeklyReviewSnapshotServer(
  weekly: WeeklyReviewData,
  snapshot: ReviewSnapshot = weekly.snapshot
): Promise<WeeklyReviewData> {
  await persistReviewSnapshotServer(snapshot);
  return snapshot === weekly.snapshot
    ? weekly
    : {
        ...weekly,
        snapshot,
      };
}

export async function refreshWeeklyReviewArtifactsServer(
  anchorDay: string
): Promise<WeeklyReviewData> {
  const weekly = await buildWeeklySnapshotServer(anchorDay);
  return await persistWeeklyReviewSnapshotServer(weekly);
}

export async function refreshWeeklyReviewArtifactsForDaysServer(
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

    await refreshWeeklyReviewArtifactsServer(anchorDay);
  }
}

export async function loadReviewPageServer(localDay: string): Promise<ReviewPageState> {
  const weekly = await buildWeeklySnapshotServer(localDay);
  return {
    loading: false,
    localDay: weekly.anchorDay,
    weekly,
    selectedExperiment: weekly.experimentOptions[0] ?? '',
    loadNotice: '',
    saveNotice: '',
  };
}

export async function saveReviewExperimentPageServer(
  state: ReviewPageState
): Promise<ReviewPageState> {
  if (!state.weekly || !state.selectedExperiment) {
    return state;
  }

  const timestamp = nowIso();
  const snapshot: ReviewSnapshot = {
    ...state.weekly.snapshot,
    ...updateRecordMeta(state.weekly.snapshot, state.weekly.snapshot.id, timestamp),
    experiment: state.selectedExperiment,
  };

  await persistReviewSnapshotServer(snapshot);

  return {
    ...state,
    weekly: {
      ...state.weekly,
      snapshot,
    },
    saveNotice: 'Experiment saved.',
  };
}
