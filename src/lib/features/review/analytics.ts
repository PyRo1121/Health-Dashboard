import type {
	AssessmentResult,
	DailyRecord,
	FoodCatalogItem,
	FoodEntry,
	GroceryItem,
	HealthEvent,
	PlanSlot,
	RecipeCatalogItem,
	ReviewSnapshot,
	WeeklyPlan,
	SobrietyEvent
} from '$lib/core/domain/types';
import { buildHealthEventDisplay } from '$lib/core/shared/health-events';
import { startOfWeek } from '$lib/core/shared/dates';
import { buildNutritionRecommendations } from '$lib/features/nutrition/recommend';

export interface ReviewCorrelation {
	label: string;
	detail: string;
	sourceDays: string[];
}

export interface ReviewNutritionStrategyItem {
	kind: 'repeat' | 'rotate';
	recommendationKind: 'food' | 'recipe';
	recommendationId: string;
	title: string;
	detail: string;
}

export interface WeeklyReviewData {
	snapshot: ReviewSnapshot;
	averageMood: number;
	averageSleep: number;
	averageProtein: number;
	sobrietyStreak: number;
	nutritionHighlights: string[];
	nutritionStrategy: ReviewNutritionStrategyItem[];
	planningHighlights: string[];
	deviceHighlights: string[];
	assessmentSummary: string[];
	healthHighlights: string[];
	experimentOptions: string[];
}

const MIN_SLEEP_HOURS = 7;
const HIGH_PROTEIN_GRAMS = 80;
const SIGNAL_DELTA_THRESHOLD = 0.5;
export const REVIEW_EXPERIMENT_OPTIONS = [
	'Try 10 min morning mindfulness',
	'Increase hydration tracking',
	'Increase protein at breakfast'
] as const;

function round(value: number): number {
	return Number(value.toFixed(1));
}

function average(values: number[]): number {
	return round(values.reduce((sum, value) => sum + value, 0) / (values.length || 1));
}

function averageRecordMetric(
	records: DailyRecord[],
	read: (record: DailyRecord) => number | undefined
): number {
	return average(records.map((record) => read(record) ?? 0));
}

export function weekRangeFromAnchorDay(anchorDay: string): {
	weekStart: string;
	days: string[];
} {
	const weekStart = startOfWeek(anchorDay);
	const date = new Date(`${weekStart}T00:00:00Z`);

	return {
		weekStart,
		days: Array.from({ length: 7 }, (_, index) => {
			const day = new Date(date);
			day.setUTCDate(date.getUTCDate() + index);
			return day.toISOString().slice(0, 10);
		})
	};
}

export function filterByDays<T>(items: T[], readDay: (item: T) => string, days: string[]): T[] {
	return items.filter((item) => days.includes(readDay(item)));
}

export function groupProteinByDay(entries: FoodEntry[]): Map<string, number> {
	const result = new Map<string, number>();
	for (const entry of entries) {
		result.set(entry.localDay, (result.get(entry.localDay) ?? 0) + (entry.protein ?? 0));
	}
	return result;
}

export function computeTrendComparisonsFromData(
	weekStart: string,
	records: DailyRecord[],
	foodEntries: FoodEntry[]
): {
	weekStart: string;
	daysTracked: number;
	averageMood: number;
	averageSleep: number;
	averageProtein: number;
} {
	const proteinByDay = groupProteinByDay(foodEntries);

	return {
		weekStart,
		daysTracked: records.length,
		averageMood: averageRecordMetric(records, (record) => record.mood),
		averageSleep: averageRecordMetric(records, (record) => record.sleepHours),
		averageProtein: average([...proteinByDay.values()])
	};
}

export function computeCorrelations(records: DailyRecord[], foodEntries: FoodEntry[]): ReviewCorrelation[] {
	const correlations: ReviewCorrelation[] = [];
	const proteinByDay = groupProteinByDay(foodEntries);

	const highSleep = records.filter((record) => (record.sleepHours ?? 0) >= MIN_SLEEP_HOURS);
	const lowSleep = records.filter(
		(record) => (record.sleepHours ?? 0) > 0 && (record.sleepHours ?? 0) < MIN_SLEEP_HOURS
	);
	if (highSleep.length && lowSleep.length) {
		const highMood = averageRecordMetric(highSleep, (record) => record.mood);
		const lowMood = averageRecordMetric(lowSleep, (record) => record.mood);

		if (highMood - lowMood >= SIGNAL_DELTA_THRESHOLD) {
			correlations.push({
				label: 'Higher sleep tracked with better mood',
				detail: `Days with 7+ hours sleep averaged ${round(highMood)} mood vs ${round(lowMood)} on shorter-sleep days.`,
				sourceDays: [...highSleep, ...lowSleep].map((record) => record.date)
			});
		}
	}

	const highProteinDays = records.filter((record) => (proteinByDay.get(record.date) ?? 0) >= HIGH_PROTEIN_GRAMS);
	const lowProteinDays = records.filter(
		(record) => (proteinByDay.get(record.date) ?? 0) > 0 && (proteinByDay.get(record.date) ?? 0) < HIGH_PROTEIN_GRAMS
	);
	if (highProteinDays.length && lowProteinDays.length) {
		const highEnergy = averageRecordMetric(highProteinDays, (record) => record.energy);
		const lowEnergy = averageRecordMetric(lowProteinDays, (record) => record.energy);

		if (highEnergy - lowEnergy >= SIGNAL_DELTA_THRESHOLD) {
			correlations.push({
				label: 'Higher protein tracked with steadier energy',
				detail: `Days at 80g+ protein averaged ${round(highEnergy)} energy vs ${round(lowEnergy)} on lower-protein days.`,
				sourceDays: [...highProteinDays, ...lowProteinDays].map((record) => record.date)
			});
		}
	}

	return correlations;
}

export function generateReviewFlags(
	records: DailyRecord[],
	sobrietyEvents: SobrietyEvent[],
	assessments: AssessmentResult[]
): string[] {
	const flags: string[] = [];

	if (!records.length) {
		flags.push('Need more tracked days before weekly trends can become meaningful.');
		return flags;
	}

	const lowSleepDays = records.filter(
		(record) => (record.sleepHours ?? 0) > 0 && (record.sleepHours ?? 0) < MIN_SLEEP_HOURS
	);
	if (lowSleepDays.length >= 2) {
		flags.push('Sleep dipped below 7 hours on multiple tracked days.');
	}

	if (sobrietyEvents.some((event) => event.eventType === 'lapse')) {
		flags.push('A lapse was logged this week, so recovery context deserves special attention.');
	}

	const highRiskAssessment = assessments.find((assessment) => assessment.highRisk);
	if (highRiskAssessment) {
		flags.push(`${highRiskAssessment.instrument} entered a high-risk state this week.`);
	}

	return flags;
}

export function computeSobrietyStreak(records: DailyRecord[]): number {
	const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
	let streak = 0;

	for (let index = sorted.length - 1; index >= 0; index -= 1) {
		if (sorted[index]?.sobrietyStatus === 'sober') {
			streak += 1;
		} else {
			break;
		}
	}

	return streak;
}

export function buildHeadline(records: DailyRecord[], flags: string[]): string {
	if (!records.length) return 'Need more data to build your first weekly briefing';
	if (flags.some((flag) => flag.includes('high-risk'))) return 'Support first, metrics second';
	if (flags.some((flag) => flag.includes('lapse'))) return 'Recovery needs a calmer reset';
	return 'Mindful reset';
}

export function buildNutritionHighlights(records: DailyRecord[], foodEntries: FoodEntry[]): string[] {
	const proteinByDay = groupProteinByDay(foodEntries);
	return records
		.filter((record) => proteinByDay.has(record.date))
		.map((record) => `${record.date}: ${round(proteinByDay.get(record.date) ?? 0)}g protein logged`)
		.slice(0, 3);
}

export function buildPlanningHighlights(
	weeklyPlan: WeeklyPlan | null,
	planSlots: PlanSlot[],
	groceryItems: GroceryItem[]
): string[] {
	if (!weeklyPlan && !planSlots.length && !groceryItems.length) {
		return [];
	}

	const highlights: string[] = [];
	if (weeklyPlan) {
		const doneCount = planSlots.filter((slot) => slot.status === 'done').length;
		const skippedCount = planSlots.filter((slot) => slot.status === 'skipped').length;
		highlights.push(
			`${weeklyPlan.title}: ${doneCount}/${planSlots.length || 0} plan item${planSlots.length === 1 ? '' : 's'} completed${skippedCount ? `, ${skippedCount} skipped` : ''}.`
		);

		const mealSlots = planSlots.filter((slot) => slot.slotType === 'meal');
		if (mealSlots.length) {
			const mealDoneCount = mealSlots.filter((slot) => slot.status === 'done').length;
			highlights.push(`Meals planned: ${mealDoneCount}/${mealSlots.length} completed.`);
		}

		const workoutSlots = planSlots.filter((slot) => slot.slotType === 'workout');
		if (workoutSlots.length) {
			const workoutDoneCount = workoutSlots.filter((slot) => slot.status === 'done').length;
			highlights.push(`Workouts planned: ${workoutDoneCount}/${workoutSlots.length} completed.`);
		}
	}

	if (groceryItems.length) {
		const checkedCount = groceryItems.filter((item) => item.checked).length;
		const onHandCount = groceryItems.filter((item) => item.onHand).length;
		const excludedCount = groceryItems.filter((item) => item.excluded).length;
		highlights.push(
			`Groceries: ${checkedCount}/${groceryItems.length} checked${onHandCount ? `, ${onHandCount} on hand` : ''}${excludedCount ? `, ${excludedCount} excluded` : ''}.`
		);
	}

	return highlights.slice(0, 4);
}

function inferRecommendationMealType(
	records: DailyRecord[],
	foodEntries: FoodEntry[],
	healthEvents: HealthEvent[]
): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
	const averageProtein = average([...groupProteinByDay(foodEntries).values()]);
	const hadLowSleep = records.some((record) => (record.sleepHours ?? 0) > 0 && (record.sleepHours ?? 0) < MIN_SLEEP_HOURS);
	const hadAnxiety = healthEvents.some((event) => event.eventType === 'anxiety-episode');

	if (averageProtein < HIGH_PROTEIN_GRAMS) return 'breakfast';
	if (hadLowSleep || hadAnxiety) return 'lunch';
	return 'dinner';
}

export function buildNutritionStrategy(
	records: DailyRecord[],
	foodEntries: FoodEntry[],
	healthEvents: HealthEvent[],
	foodCatalogItems: FoodCatalogItem[],
	recipeCatalogItems: RecipeCatalogItem[]
): ReviewNutritionStrategyItem[] {
	if (!foodCatalogItems.length && !recipeCatalogItems.length) return [];

	const context = {
		mealType: inferRecommendationMealType(records, foodEntries, healthEvents),
		sleepHours: averageRecordMetric(records, (record) => record.sleepHours),
		sleepQuality: averageRecordMetric(records, (record) => record.sleepQuality),
		anxietyCount: healthEvents.filter((event) => event.eventType === 'anxiety-episode').length,
		symptomCount: healthEvents.filter((event) => event.eventType === 'symptom').length
	};

	const recommendations = buildNutritionRecommendations({
		context,
		foods: foodCatalogItems,
		recipes: recipeCatalogItems,
		limit: 6
	});

	const loggedNames = new Set(foodEntries.map((entry) => entry.name?.trim()).filter(Boolean) as string[]);
	const repeatCandidate =
		recommendations.find((candidate) => candidate.kind === 'food' && loggedNames.has(candidate.title)) ??
		recommendations.find((candidate) => candidate.kind === 'food');
	const rotateCandidate =
		recommendations.find((candidate) => candidate.kind === 'recipe') ??
		recommendations.find((candidate) => candidate.kind === 'food' && candidate.id !== repeatCandidate?.id);

	const strategy: ReviewNutritionStrategyItem[] = [];

	if (repeatCandidate) {
		strategy.push({
			kind: 'repeat',
			recommendationKind: repeatCandidate.kind,
			recommendationId: repeatCandidate.id,
			title: repeatCandidate.title,
			detail: repeatCandidate.reasons[0] ?? repeatCandidate.subtitle
		});
	}

	if (rotateCandidate) {
		strategy.push({
			kind: 'rotate',
			recommendationKind: rotateCandidate.kind,
			recommendationId: rotateCandidate.id,
			title: rotateCandidate.title,
			detail: rotateCandidate.reasons[0] ?? rotateCandidate.subtitle
		});
	}

	return strategy;
}

export function buildAssessmentSummary(assessments: AssessmentResult[]): string[] {
	return assessments
		.filter((assessment) => assessment.isComplete)
		.slice(0, 3)
		.map((assessment) => `${assessment.instrument}: ${assessment.band ?? 'In progress'} (${assessment.totalScore ?? 0})`);
}

export function buildDeviceHighlights(events: HealthEvent[]): string[] {
	return events
		.filter((event) => event.sourceType === 'native-companion')
		.sort((a, b) => (b.sourceTimestamp ?? b.createdAt).localeCompare(a.sourceTimestamp ?? a.createdAt))
		.slice(0, 3)
		.map((event) => {
			const display = buildHealthEventDisplay(event);
			return `${display.label}: ${display.valueLabel} on ${event.localDay}`;
		});
}

export function buildHealthHighlights(records: DailyRecord[], events: HealthEvent[]): string[] {
	const highlights: string[] = [];

	const lowSleepDays = new Set(
		records
			.filter((record) => (record.sleepHours ?? 0) > 0 && (record.sleepHours ?? 0) < MIN_SLEEP_HOURS)
			.map((record) => record.date)
	);

	const anxietyEvents = events.filter((event) => event.eventType === 'anxiety-episode');
	const linkedAnxietyDay = anxietyEvents.find((event) => lowSleepDays.has(event.localDay));
	if (linkedAnxietyDay) {
		highlights.push(`Low sleep lined up with higher anxiety on ${linkedAnxietyDay.localDay}.`);
	}

	const strongSymptomEvent = events.find(
		(event) => event.eventType === 'symptom' && typeof event.value === 'number' && event.value >= 4
	);
	if (strongSymptomEvent) {
		highlights.push(`A high-severity symptom was logged on ${strongSymptomEvent.localDay}.`);
	}

	return highlights;
}
