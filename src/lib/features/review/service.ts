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
import type {
  AdherenceMatch,
  AssessmentResult,
  DailyRecord,
  DerivedGroceryItem,
  FoodCatalogItem,
  FoodEntry,
  GroceryItem,
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
  type ReviewDecisionCard,
  type ReviewDecision,
  type ReviewRecommendationTarget,
  type ReviewWeeklyRecommendation,
} from './analytics';

export type { ReviewCorrelation, WeeklyReviewData } from './analytics';
export { computeCorrelations, generateReviewFlags } from './analytics';

function buildReviewRecommendationTarget(input: {
  kind: 'food' | 'recipe' | 'plan';
  id?: string;
}): ReviewRecommendationTarget {
  return input;
}

function toDecision(kind: 'repeat' | 'rotate' | 'skip'): ReviewDecision {
  if (kind === 'repeat') return 'continue';
  if (kind === 'rotate') return 'adjust';
  return 'stop';
}

function toTargetFromStrategy(
  item: WeeklyReviewData['nutritionStrategy'][number]
): ReviewRecommendationTarget {
  return buildReviewRecommendationTarget({
    kind: item.recommendationKind,
    id: item.recommendationId,
  });
}

function buildWhatChangedEnoughToMatter(input: {
  correlations: WeeklyReviewData['snapshot']['correlations'];
  healthHighlights: string[];
  contextSignals: string[];
  grocerySignals: string[];
  deviceHighlights: string[];
  patternHighlights: string[];
}): string[] {
  const items = [
    ...input.healthHighlights,
    ...input.contextSignals,
    ...input.patternHighlights,
    ...input.grocerySignals,
    ...input.deviceHighlights,
    ...input.correlations.map((item) => item.label),
  ].filter(Boolean);

  return [...new Set(items)].slice(0, 4);
}

function buildWeeklyDecisionCards(input: {
  nutritionStrategy: WeeklyReviewData['nutritionStrategy'];
}): ReviewDecisionCard[] {
  return input.nutritionStrategy.slice(0, 3).map((item) => ({
    decision: toDecision(item.kind),
    title: item.title,
    detail: item.detail,
    target: toTargetFromStrategy(item),
  }));
}

function buildWeeklyRecommendation(input: {
  nutritionStrategy: WeeklyReviewData['nutritionStrategy'];
  adherenceScores: WeeklyReviewData['adherenceScores'];
  grocerySignals: string[];
  whatChangedHighlights: string[];
}): ReviewWeeklyRecommendation | null {
  const strategyLead = input.nutritionStrategy[0];
  const overall = input.adherenceScores.find((score) => score.label === 'Overall');

  if (strategyLead) {
    const decision = toDecision(strategyLead.kind);
    return {
      decision,
      title:
        decision === 'continue'
          ? `Continue with ${strategyLead.title}`
          : decision === 'adjust'
            ? `Adjust with ${strategyLead.title}`
            : `Stop planning ${strategyLead.title}`,
      summary:
        decision === 'continue'
          ? 'This is the clearest candidate to keep because the week supported it.'
          : decision === 'adjust'
            ? 'This is the clearest adjustment because the week suggests a better next version.'
            : 'This is the clearest thing to stop because the week did not support it.',
      confidence:
        overall && overall.score >= 80 ? 'high' : overall && overall.score >= 50 ? 'medium' : 'low',
      expectedImpact:
        decision === 'continue'
          ? 'Keep the next week simpler and more repeatable.'
          : decision === 'adjust'
            ? 'Reduce friction while keeping momentum.'
            : 'Prevent another avoidable miss next week.',
      provenance: [...input.whatChangedHighlights.slice(0, 2), strategyLead.detail].filter(Boolean),
      actionLabel:
        strategyLead.recommendationKind === 'food'
          ? decision === 'stop'
            ? 'Review food'
            : 'Load food'
          : decision === 'stop'
            ? 'Review recipe'
            : 'Load recipe',
      target: toTargetFromStrategy(strategyLead),
    };
  }

  if (input.grocerySignals.length) {
    return {
      decision: 'adjust',
      title: 'Adjust the weekly plan before the next grocery cycle',
      summary: 'The week surfaced enough grocery friction that the plan needs a tighter next pass.',
      confidence: 'medium',
      expectedImpact: 'Reduce waste and keep next-week execution cleaner.',
      provenance: input.grocerySignals.slice(0, 2),
      actionLabel: 'Open Plan',
      target: buildReviewRecommendationTarget({ kind: 'plan' }),
    };
  }

  return null;
}

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

  const snapshot: ReviewSnapshot = {
    ...updateRecordMeta(existingSnapshot, `review:${weekStart}`, timestamp),
    weekStart,
    headline: buildHeadline(weekRecords, flags),
    daysTracked: weekRecords.length,
    flags,
    correlations,
    experiment: existingSnapshot?.experiment,
  };

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
  const healthHighlights = buildHealthHighlights(weekRecords, weekHealthEvents);
  const contextSignals = buildContextSignals(weekRecords, weekHealthEvents, weekJournalEntries);
  const patternHighlights = buildPatternHighlights(weekJournalEntries, weekHealthEvents);
  const grocerySignals = buildGrocerySignals(weekPlanSlots, weekGroceries, anchorDay);
  const whatChangedHighlights = buildWhatChangedEnoughToMatter({
    correlations,
    healthHighlights,
    contextSignals,
    grocerySignals,
    deviceHighlights: buildDeviceHighlights(weekHealthEvents),
    patternHighlights,
  });
  const weeklyDecisionCards = buildWeeklyDecisionCards({
    nutritionStrategy,
  });
  const weeklyRecommendation = buildWeeklyRecommendation({
    nutritionStrategy,
    adherenceScores,
    grocerySignals,
    whatChangedHighlights,
  });

  return {
    anchorDay,
    snapshot,
    averageMood: trends.averageMood,
    averageSleep: trends.averageSleep,
    averageProtein: trends.averageProtein,
    sobrietyStreak: computeSobrietyStreak(weekRecords),
    nutritionHighlights: buildNutritionHighlights(weekRecords, weekFood),
    nutritionStrategy,
    planningHighlights: buildPlanningHighlights(weeklyPlan, weekPlanSlots, weekGroceries),
    adherenceScores,
    adherenceSignals: buildAdherenceSignals(adherenceMatches),
    adherenceMatches,
    grocerySignals,
    deviceHighlights: buildDeviceHighlights(weekHealthEvents),
    assessmentSummary: buildAssessmentSummary(weekAssessments),
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
    experimentOptions: [...REVIEW_EXPERIMENT_OPTIONS],
  };
}

async function listAdherenceMatchesForWeek(
  store: ReviewStorage,
  weekStart: string
): Promise<AdherenceMatch[]> {
  return await store.adherenceMatches.where('weekStart').equals(weekStart).toArray();
}

async function listDerivedGroceriesForPlan(
  store: ReviewStorage,
  weeklyPlanId: string
): Promise<DerivedGroceryItem[]> {
  return await store.derivedGroceryItems.where('weeklyPlanId').equals(weeklyPlanId).toArray();
}

async function listManualGroceriesForPlan(
  store: ReviewStorage,
  weeklyPlanId: string
): Promise<ManualGroceryItem[]> {
  return await store.manualGroceryItems.where('weeklyPlanId').equals(weeklyPlanId).toArray();
}

async function persistDerivedGroceries(
  store: ReviewStorage,
  nextItems: DerivedGroceryItem[],
  existingItems: DerivedGroceryItem[]
): Promise<void> {
  for (const item of nextItems) {
    await store.derivedGroceryItems.put(item);
  }

  for (const staleItem of existingItems) {
    if (!nextItems.find((item) => item.id === staleItem.id)) {
      await store.derivedGroceryItems.delete(staleItem.id);
    }
  }
}

async function persistAdherenceMatches(
  store: ReviewStorage,
  nextMatches: AdherenceMatch[],
  existingMatches: AdherenceMatch[]
): Promise<void> {
  for (const match of nextMatches) {
    await store.adherenceMatches.put(match);
  }

  for (const staleMatch of existingMatches) {
    if (!nextMatches.find((match) => match.id === staleMatch.id)) {
      await store.adherenceMatches.delete(staleMatch.id);
    }
  }
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

async function persistReviewSnapshot(
  store: ReviewStorage,
  weekly: WeeklyReviewData,
  snapshot: ReviewSnapshot = weekly.snapshot
): Promise<WeeklyReviewData> {
  await store.reviewSnapshots.put(snapshot);
  return snapshot === weekly.snapshot
    ? weekly
    : {
        ...weekly,
        snapshot,
      };
}

export async function saveNextWeekExperiment(
  store: ReviewStorage,
  anchorDay: string,
  experiment: string
): Promise<ReviewSnapshot> {
  const weekly = await buildWeeklySnapshot(store, anchorDay);
  const timestamp = nowIso();

  const snapshot: ReviewSnapshot = {
    ...weekly.snapshot,
    ...updateRecordMeta(weekly.snapshot, weekly.snapshot.id, timestamp),
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
