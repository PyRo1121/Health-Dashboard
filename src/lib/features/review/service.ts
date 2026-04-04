import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type {
	ReviewSnapshot,
} from '$lib/core/domain/types';
import { updateRecordMeta } from '$lib/core/shared/records';
import {
	buildAssessmentSummary,
	buildDeviceHighlights,
	buildHealthHighlights,
	buildHeadline,
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
	type WeeklyReviewData
} from './analytics';

export type { ReviewCorrelation, WeeklyReviewData } from './analytics';
export { computeCorrelations, generateReviewFlags } from './analytics';

export async function computeTrendComparisons(db: HealthDatabase, anchorDay: string): Promise<{
	weekStart: string;
	daysTracked: number;
	averageMood: number;
	averageSleep: number;
	averageProtein: number;
}> {
	const { weekStart, days } = weekRangeFromAnchorDay(anchorDay);
	const records = (await db.dailyRecords.toArray()).filter((record) => days.includes(record.date));
	const foodEntries = (await db.foodEntries.toArray()).filter((entry) => days.includes(entry.localDay));
	return computeTrendComparisonsFromData(weekStart, records, foodEntries);
}

export async function buildWeeklySnapshot(db: HealthDatabase, anchorDay: string): Promise<WeeklyReviewData> {
	const { weekStart, days } = weekRangeFromAnchorDay(anchorDay);
	const [records, foodEntries, sobrietyEvents, assessments, healthEvents, foodCatalogItems, recipeCatalogItems, weeklyPlans, planSlots, groceryItems] = await Promise.all([
		db.dailyRecords.toArray(),
		db.foodEntries.toArray(),
		db.sobrietyEvents.toArray(),
		db.assessmentResults.toArray(),
		db.healthEvents.toArray(),
		db.foodCatalogItems.toArray(),
		db.recipeCatalogItems.toArray(),
		db.weeklyPlans.toArray(),
		db.planSlots.toArray(),
		db.groceryItems.toArray()
	]);

	const weekRecords = filterByDays(records, (record) => record.date, days);
	const weekFood = filterByDays(foodEntries, (entry) => entry.localDay, days);
	const weekSobriety = filterByDays(sobrietyEvents, (event) => event.localDay, days);
	const weekAssessments = filterByDays(assessments, (assessment) => assessment.localDay, days);
	const weekHealthEvents = filterByDays(healthEvents, (event) => event.localDay, days);
	const weeklyPlan = weeklyPlans.find((plan) => plan.weekStart === weekStart) ?? null;
	const weekPlanSlots = weeklyPlan
		? planSlots.filter((slot) => slot.weeklyPlanId === weeklyPlan.id)
		: [];
	const weekGroceries = weeklyPlan
		? groceryItems.filter((item) => item.weeklyPlanId === weeklyPlan.id)
		: [];

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
		experiment: existing?.experiment
	};

	return {
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
			recipeCatalogItems
		),
		planningHighlights: buildPlanningHighlights(weeklyPlan, weekPlanSlots, weekGroceries),
		deviceHighlights: buildDeviceHighlights(weekHealthEvents),
		assessmentSummary: buildAssessmentSummary(weekAssessments),
		healthHighlights: buildHealthHighlights(weekRecords, weekHealthEvents),
		experimentOptions: [...REVIEW_EXPERIMENT_OPTIONS]
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
		experiment
	};

	await db.reviewSnapshots.put(snapshot);
	return snapshot;
}
