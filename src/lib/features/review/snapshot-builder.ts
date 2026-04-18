import { nowIso } from '$lib/core/domain/time';
import type {
  AdherenceMatch,
  AssessmentResult,
  DailyRecord,
  FoodCatalogItem,
  FoodEntry,
  GroceryItem,
  HealthEvent,
  JournalEntry,
  PlanSlot,
  RecipeCatalogItem,
  ReviewSnapshot,
  SobrietyEvent,
  WeeklyPlan,
} from '$lib/core/domain/types';
import { updateRecordMeta } from '$lib/core/shared/records';
import {
  buildAdherenceScores,
  buildAdherenceSignals,
  buildAssessmentSummary,
  buildContextSignals,
  buildDeviceHighlights,
  buildGrocerySignals,
  buildHealthHighlights,
  buildHealthReferenceLinks,
  buildHeadline,
  buildJournalHighlights,
  buildPatternHighlights,
  buildSymptomReferenceLinks,
  buildNutritionHighlights,
  buildNutritionStrategy,
  buildPlanningHighlights,
  computeCorrelations,
  computeSobrietyStreak,
  computeTrendComparisonsFromData,
  filterByDays,
  generateReviewFlags,
  weekRangeFromAnchorDay,
  type WeeklyReviewData,
} from './analytics';
import {
  buildReviewExperimentCandidates,
  buildSavedExperimentVerdict,
  buildWeeklyDecisionCards,
  buildWeeklyRecommendation,
  buildWhatChangedEnoughToMatter,
  resolveSelectedExperimentId,
} from './recommendation-engine';
import type { RecommendationEngineInput } from './recommendation-engine-shared';
import { reviewExperimentIdFromLabel } from './experiment-registry';

export interface ReviewSourceData {
  dailyRecords: DailyRecord[];
  foodEntries: FoodEntry[];
  sobrietyEvents: SobrietyEvent[];
  assessments: AssessmentResult[];
  healthEvents: HealthEvent[];
  journalEntries: JournalEntry[];
  foodCatalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  weeklyPlans: WeeklyPlan[];
  planSlots: PlanSlot[];
}

export interface ReviewWeekData {
  anchorDay: string;
  weekStart: string;
  weekRecords: DailyRecord[];
  weekFood: FoodEntry[];
  weekSobriety: SobrietyEvent[];
  weekAssessments: AssessmentResult[];
  weekHealthEvents: HealthEvent[];
  weekJournalEntries: JournalEntry[];
  foodCatalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  weeklyPlan: WeeklyPlan | null;
  weekPlanSlots: PlanSlot[];
}

function latestDay(days: Array<string | null | undefined>): string | null {
  return (
    days
      .filter((day): day is string => Boolean(day))
      .sort()
      .at(-1) ?? null
  );
}

export function resolveReviewAnchorDayFromSourceData(
  sourceData: ReviewSourceData,
  requestedAnchorDay: string
): string {
  const { weekStart, days } = weekRangeFromAnchorDay(requestedAnchorDay);
  const daySet = new Set(days);
  const {
    dailyRecords,
    foodEntries,
    sobrietyEvents,
    assessments,
    healthEvents,
    journalEntries,
    weeklyPlans,
    planSlots,
  } = sourceData;

  const weeklyPlanIds = new Set(
    weeklyPlans.filter((plan) => plan.weekStart === weekStart).map((plan) => plan.id)
  );
  const hasActivity =
    dailyRecords.some((record) => daySet.has(record.date)) ||
    foodEntries.some((entry) => daySet.has(entry.localDay)) ||
    sobrietyEvents.some((event) => daySet.has(event.localDay)) ||
    assessments.some((assessment) => daySet.has(assessment.localDay)) ||
    healthEvents.some((event) => daySet.has(event.localDay)) ||
    journalEntries.some((entry) => daySet.has(entry.localDay)) ||
    planSlots.some((slot) => weeklyPlanIds.has(slot.weeklyPlanId));

  const latestAnchorDay = latestDay([
    ...dailyRecords.map((record) => record.date),
    ...foodEntries.map((entry) => entry.localDay),
    ...sobrietyEvents.map((event) => event.localDay),
    ...assessments.map((assessment) => assessment.localDay),
    ...healthEvents.map((event) => event.localDay),
    ...journalEntries.map((entry) => entry.localDay),
    ...weeklyPlans.map((plan) => plan.weekStart),
  ]);

  if (hasActivity || !latestAnchorDay) {
    return requestedAnchorDay;
  }

  return latestAnchorDay;
}

export function selectReviewWeekData(
  sourceData: ReviewSourceData,
  anchorDay: string
): ReviewWeekData {
  const { weekStart, days } = weekRangeFromAnchorDay(anchorDay);
  const {
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
  } = sourceData;
  const weekRecords = filterByDays(dailyRecords, (record) => record.date, days);
  const weekFood = filterByDays(foodEntries, (entry) => entry.localDay, days);
  const weekSobriety = filterByDays(sobrietyEvents, (event) => event.localDay, days);
  const weekAssessments = filterByDays(assessments, (assessment) => assessment.localDay, days);
  const weekHealthEvents = filterByDays(healthEvents, (event) => event.localDay, days);
  const weekJournalEntries = filterByDays(journalEntries, (entry) => entry.localDay, days);
  const weeklyPlan = weeklyPlans.find((plan) => plan.weekStart === weekStart) ?? null;
  const weekPlanSlots = weeklyPlan
    ? planSlots.filter((slot) => slot.weeklyPlanId === weeklyPlan.id)
    : [];

  return {
    anchorDay,
    weekStart,
    weekRecords,
    weekFood,
    weekSobriety,
    weekAssessments,
    weekHealthEvents,
    weekJournalEntries,
    foodCatalogItems,
    recipeCatalogItems,
    weeklyPlan,
    weekPlanSlots,
  };
}

export function buildWeeklySnapshotFromWeekData(input: {
  weekData: ReviewWeekData;
  existingSnapshot?: ReviewSnapshot;
  weekGroceries: GroceryItem[];
  adherenceMatches: AdherenceMatch[];
}): WeeklyReviewData {
  const { weekData, existingSnapshot, weekGroceries, adherenceMatches } = input;
  const {
    anchorDay,
    weekStart,
    weekRecords,
    weekFood,
    weekSobriety,
    weekAssessments,
    weekHealthEvents,
    weekJournalEntries,
    foodCatalogItems,
    recipeCatalogItems,
    weeklyPlan,
    weekPlanSlots,
  } = weekData;
  const journalDays = new Set(weekJournalEntries.map((entry) => entry.localDay));
  const trends = computeTrendComparisonsFromData(weekStart, weekRecords, weekFood);
  const correlations = computeCorrelations(weekRecords, weekFood);
  const flags = generateReviewFlags(weekRecords, weekSobriety, weekAssessments);
  const timestamp = nowIso();

  const nutritionStrategy = buildNutritionStrategy(
    weekRecords,
    weekFood,
    weekHealthEvents,
    foodCatalogItems,
    recipeCatalogItems,
    weekPlanSlots,
    weekGroceries
  );
  const adherenceScores = buildAdherenceScores(adherenceMatches);
  const adherenceSignals = buildAdherenceSignals(adherenceMatches);
  const nutritionHighlights = buildNutritionHighlights(weekRecords, weekFood);
  const planningHighlights = buildPlanningHighlights(weeklyPlan, weekPlanSlots, weekGroceries);
  const deviceHighlights = buildDeviceHighlights(weekHealthEvents);
  const assessmentSummary = buildAssessmentSummary(weekAssessments);
  const healthReferenceLinks = buildHealthReferenceLinks(weekHealthEvents);
  const symptomReferenceLinks = buildSymptomReferenceLinks(weekHealthEvents);
  const healthHighlights = buildHealthHighlights(weekRecords, weekHealthEvents);
  const contextSignals = buildContextSignals(weekRecords, weekHealthEvents, weekJournalEntries);
  const patternHighlights = buildPatternHighlights(weekJournalEntries, weekHealthEvents);
  const grocerySignals = buildGrocerySignals(weekPlanSlots, weekGroceries, anchorDay);
  const whatChangedHighlights = buildWhatChangedEnoughToMatter({
    correlations,
    assessmentSummary,
    healthHighlights,
    contextSignals,
    planningHighlights,
    grocerySignals,
    deviceHighlights,
    patternHighlights,
  });

  const snapshot: ReviewSnapshot = {
    ...updateRecordMeta(existingSnapshot, `review:${weekStart}`, timestamp),
    weekStart,
    headline: '',
    daysTracked: weekRecords.length,
    flags,
    correlations,
    experimentId:
      existingSnapshot?.experimentId ??
      reviewExperimentIdFromLabel(existingSnapshot?.experiment) ??
      undefined,
    experiment: existingSnapshot?.experiment,
  };
  const recommendationInput: RecommendationEngineInput = {
    snapshot,
    averageSleep: trends.averageSleep,
    averageProtein: trends.averageProtein,
    nutritionStrategy,
    nutritionHighlights,
    planningHighlights,
    adherenceScores,
    adherenceSignals,
    grocerySignals,
    deviceHighlights,
    assessmentSummary,
    whatChangedHighlights,
    contextSignals,
    healthHighlights,
    patternHighlights,
  };
  const weeklyDecisionCards = buildWeeklyDecisionCards(recommendationInput);
  const weeklyRecommendation = buildWeeklyRecommendation(recommendationInput);
  const experimentCandidates = buildReviewExperimentCandidates(recommendationInput);
  const savedExperimentVerdict = buildSavedExperimentVerdict(recommendationInput);
  const experimentOptions = experimentCandidates.map((candidate) => candidate.label);
  const selectedExperimentId = resolveSelectedExperimentId(experimentCandidates, snapshot);
  snapshot.headline = buildHeadline({
    records: weekRecords,
    assessments: weekAssessments,
    sobrietyEvents: weekSobriety,
    healthEvents: weekHealthEvents,
    journalEntries: weekJournalEntries,
    averageProtein: trends.averageProtein,
    adherenceScores,
    recommendation: weeklyRecommendation,
  });

  return {
    anchorDay,
    snapshot,
    averageMood: trends.averageMood,
    averageSleep: trends.averageSleep,
    averageProtein: trends.averageProtein,
    sobrietyStreak: computeSobrietyStreak(weekRecords),
    nutritionHighlights,
    nutritionStrategy,
    planningHighlights,
    adherenceScores,
    adherenceSignals,
    adherenceMatches,
    grocerySignals,
    deviceHighlights,
    assessmentSummary,
    healthReferenceLinks,
    symptomReferenceLinks,
    healthHighlights,
    contextSignals,
    contextCaptureLinkedEventIds: weekHealthEvents
      .filter((event) => journalDays.has(event.localDay))
      .map((event) => event.id)
      .slice(0, 5),
    journalHighlights: buildJournalHighlights(weekJournalEntries),
    journalReflectionLinkedEventIds: weekJournalEntries
      .flatMap((entry) => entry.linkedEventIds)
      .slice(0, 5),
    patternHighlights,
    whatChangedHighlights,
    weeklyRecommendation,
    weeklyDecisionCards,
    experimentCandidates,
    savedExperimentVerdict,
    selectedExperimentId,
    experimentOptions,
  };
}
