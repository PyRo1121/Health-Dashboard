import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type { ReviewSnapshot } from '$lib/core/domain/types';
import { startOfWeek } from '$lib/core/shared/dates';
import { updateRecordMeta } from '$lib/core/shared/records';
import { buildWeekAdherenceMatches } from '$lib/features/adherence/service';
import { deriveWeeklyGroceriesWithWarnings } from '$lib/features/groceries/service';
import {
  buildAdherenceScores,
  buildAdherenceSignals,
  buildAssessmentSummary,
  buildContextSignals,
  buildDeviceHighlights,
  buildGrocerySignals,
  buildHealthHighlights,
  buildHeadline,
  buildJournalHighlights,
  buildPatternHighlights,
  buildNutritionHighlights,
  buildNutritionStrategy,
  buildPlanningHighlights,
  computeCorrelations,
  computeSobrietyStreak,
  computeTrendComparisonsFromData,
  filterByDays,
  generateReviewFlags,
  REVIEW_EXPERIMENT_OPTIONS,
  weekRangeFromAnchorDay,
  type WeeklyReviewData,
} from './analytics';

export type { ReviewCorrelation, WeeklyReviewData } from './analytics';
export { computeCorrelations, generateReviewFlags } from './analytics';

export async function computeTrendComparisons(
  db: HealthDatabase,
  anchorDay: string
): Promise<{
  weekStart: string;
  daysTracked: number;
  averageMood: number;
  averageSleep: number;
  averageProtein: number;
}> {
  const { weekStart, days } = weekRangeFromAnchorDay(anchorDay);
  const records = (await db.dailyRecords.toArray()).filter((record) => days.includes(record.date));
  const foodEntries = (await db.foodEntries.toArray()).filter((entry) =>
    days.includes(entry.localDay)
  );
  return computeTrendComparisonsFromData(weekStart, records, foodEntries);
}

export async function buildWeeklySnapshot(
  db: HealthDatabase,
  anchorDay: string
): Promise<WeeklyReviewData> {
  const { weekStart, days } = weekRangeFromAnchorDay(anchorDay);
  const [
    records,
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
    db.dailyRecords.toArray(),
    db.foodEntries.toArray(),
    db.sobrietyEvents.toArray(),
    db.assessmentResults.toArray(),
    db.healthEvents.toArray(),
    db.journalEntries.toArray(),
    db.foodCatalogItems.toArray(),
    db.recipeCatalogItems.toArray(),
    db.weeklyPlans.toArray(),
    db.planSlots.toArray(),
  ]);

  const weekRecords = filterByDays(records, (record) => record.date, days);
  const weekFood = filterByDays(foodEntries, (entry) => entry.localDay, days);
  const weekSobriety = filterByDays(sobrietyEvents, (event) => event.localDay, days);
  const weekAssessments = filterByDays(assessments, (assessment) => assessment.localDay, days);
  const weekHealthEvents = filterByDays(healthEvents, (event) => event.localDay, days);
  const weekJournalEntries = filterByDays(journalEntries, (entry) => entry.localDay, days);
  const journalDays = new Set(weekJournalEntries.map((entry) => entry.localDay));
  const weeklyPlan = weeklyPlans.find((plan) => plan.weekStart === weekStart) ?? null;
  const weekPlanSlots = weeklyPlan
    ? planSlots.filter((slot) => slot.weeklyPlanId === weeklyPlan.id)
    : [];
  const weekGroceries = weeklyPlan
    ? (await deriveWeeklyGroceriesWithWarnings(db, weeklyPlan.id, recipeCatalogItems)).items
    : [];
  const adherenceMatches = await buildWeekAdherenceMatches(
    db,
    weekStart,
    weekPlanSlots,
    weekFood,
    anchorDay
  );

  const trends = computeTrendComparisonsFromData(weekStart, weekRecords, weekFood);
  const correlations = computeCorrelations(weekRecords, weekFood);
  const flags = generateReviewFlags(weekRecords, weekSobriety, weekAssessments);
  const existing = await db.reviewSnapshots.get(`review:${weekStart}`);
  const timestamp = nowIso();

  const snapshot: ReviewSnapshot = {
    ...updateRecordMeta(existing, `review:${weekStart}`, timestamp),
    weekStart,
    headline: buildHeadline(weekRecords, flags),
    daysTracked: weekRecords.length,
    flags,
    correlations,
    experiment: existing?.experiment,
  };

  return {
    anchorDay,
    snapshot,
    averageMood: trends.averageMood,
    averageSleep: trends.averageSleep,
    averageProtein: trends.averageProtein,
    sobrietyStreak: computeSobrietyStreak(weekRecords),
    nutritionHighlights: buildNutritionHighlights(weekRecords, weekFood),
    nutritionStrategy: buildNutritionStrategy(
      weekRecords,
      weekFood,
      weekHealthEvents,
      foodCatalogItems,
      recipeCatalogItems,
      weekPlanSlots,
      weekGroceries
    ),
    planningHighlights: buildPlanningHighlights(weeklyPlan, weekPlanSlots, weekGroceries),
    adherenceScores: buildAdherenceScores(adherenceMatches),
    adherenceSignals: buildAdherenceSignals(adherenceMatches),
    adherenceMatches,
    grocerySignals: buildGrocerySignals(weekPlanSlots, weekGroceries, anchorDay),
    deviceHighlights: buildDeviceHighlights(weekHealthEvents),
    assessmentSummary: buildAssessmentSummary(weekAssessments),
    healthHighlights: buildHealthHighlights(weekRecords, weekHealthEvents),
    contextSignals: buildContextSignals(weekRecords, weekHealthEvents, weekJournalEntries),
    contextCaptureLinkedEventIds: weekHealthEvents
      .filter((event) => journalDays.has(event.localDay))
      .map((event) => event.id)
      .slice(0, 5),
    journalHighlights: buildJournalHighlights(weekJournalEntries),
    journalReflectionLinkedEventIds: weekJournalEntries
      .flatMap((entry) => entry.linkedEventIds)
      .slice(0, 5),
    patternHighlights: buildPatternHighlights(weekJournalEntries, weekHealthEvents),
    experimentOptions: [...REVIEW_EXPERIMENT_OPTIONS],
  };
}

export async function saveNextWeekExperiment(
  db: HealthDatabase,
  anchorDay: string,
  experiment: string
): Promise<ReviewSnapshot> {
  const weekly = await buildWeeklySnapshot(db, anchorDay);
  const timestamp = nowIso();

  const snapshot: ReviewSnapshot = {
    ...weekly.snapshot,
    ...updateRecordMeta(weekly.snapshot, weekly.snapshot.id, timestamp),
    experiment,
  };

  await db.reviewSnapshots.put(snapshot);
  return snapshot;
}

export async function refreshWeeklyReviewArtifacts(
  db: HealthDatabase,
  anchorDay: string
): Promise<WeeklyReviewData> {
  const weekly = await buildWeeklySnapshot(db, anchorDay);
  await db.reviewSnapshots.put(weekly.snapshot);
  return weekly;
}

function isDatabaseClosedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'DatabaseClosedError' || /database has been closed/i.test(error.message))
  );
}

export async function refreshWeeklyReviewArtifactsSafely(
  db: HealthDatabase,
  anchorDay: string
): Promise<void> {
  try {
    await refreshWeeklyReviewArtifacts(db, anchorDay);
  } catch (error) {
    if (!isDatabaseClosedError(error)) {
      throw error;
    }
  }
}

export async function refreshWeeklyReviewArtifactsForDaysSafely(
  db: HealthDatabase,
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

    await refreshWeeklyReviewArtifactsSafely(db, anchorDay);
  }
}
