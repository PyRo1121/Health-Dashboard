import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type {
	DailyRecord,
	FoodCatalogItem,
	FoodEntry,
	HealthEvent,
	JournalEntry,
	PlanSlot,
	PlannedMeal
} from '$lib/core/domain/types';
import { upsertDailyRecord } from '$lib/core/shared/daily-records';
import { createRecordMeta } from '$lib/core/shared/records';
import {
	buildDailyNutritionSummary,
	clearPlannedMeal,
	createFoodEntry,
	listFoodCatalogItems,
	getPlannedMeal,
	listRecipeCatalogItems
} from '$lib/features/nutrition/service';
import { listExerciseCatalogItems } from '$lib/features/movement/service';
import { createSlotSummary } from '$lib/features/planning/model';
import {
	listPlanSlotsForDay,
	listWorkoutTemplates,
	updatePlanSlotStatus
} from '$lib/features/planning/service';

export interface TodayPlanItem {
	id: string;
	title: string;
	subtitle: string;
	status: PlanSlot['status'];
}

export interface TodayPlannedWorkout {
	id: string;
	title: string;
	subtitle: string;
	status: PlanSlot['status'];
}

interface TodayPlannedMealCandidate {
	kind: 'standalone' | 'plan-slot-food';
	meal: PlannedMeal;
	slotId?: string;
}

export interface DailyCheckinInput {
	date: string;
	mood: number;
	energy: number;
	stress: number;
	focus: number;
	sleepHours: number;
	sleepQuality: number;
	freeformNote?: string;
}

export interface TodaySnapshot {
	date: string;
	dailyRecord: DailyRecord | null;
	foodEntries: FoodEntry[];
	nutritionSummary: {
		calories: number;
		protein: number;
		fiber: number;
		carbs: number;
		fat: number;
	};
	plannedMeal: PlannedMeal | null;
	plannedMealIssue: string | null;
	plannedWorkout: TodayPlannedWorkout | null;
	plannedWorkoutIssue: string | null;
	planItems: TodayPlanItem[];
	events: HealthEvent[];
	latestJournalEntry: JournalEntry | null;
}

interface TodayPlannedMealResolution {
	candidate: TodayPlannedMealCandidate | null;
	issue: string | null;
}

const CHECKIN_EVENT_FIELDS = [
	'mood',
	'energy',
	'stress',
	'focus',
	'sleepHours',
	'sleepQuality'
] as const satisfies ReadonlyArray<keyof Pick<
	DailyCheckinInput,
	'mood' | 'energy' | 'stress' | 'focus' | 'sleepHours' | 'sleepQuality'
>>;

function buildEvent(localDay: string, eventType: string, value: number, timestamp: string): HealthEvent {
	return {
		...createRecordMeta(`manual:${localDay}:${eventType}`, timestamp),
		sourceType: 'manual',
		sourceApp: 'personal-health-cockpit',
		sourceRecordId: `daily:${localDay}:${eventType}`,
		sourceTimestamp: timestamp,
		localDay,
		timezone: 'UTC',
		confidence: 1,
		eventType,
		value
	};
}

export async function saveDailyCheckin(db: HealthDatabase, input: DailyCheckinInput): Promise<DailyRecord> {
	const timestamp = nowIso();
	const record = await upsertDailyRecord(db, input.date, {
		mood: input.mood,
		energy: input.energy,
		stress: input.stress,
		focus: input.focus,
		sleepHours: input.sleepHours,
		sleepQuality: input.sleepQuality,
		freeformNote: input.freeformNote
	});

	await Promise.all(
		CHECKIN_EVENT_FIELDS.map((eventType) =>
			db.healthEvents.put(buildEvent(input.date, eventType, input[eventType], timestamp))
		)
	);

	return record;
}

export async function listEventsForDay(db: HealthDatabase, date: string): Promise<HealthEvent[]> {
	return db.healthEvents.where('localDay').equals(date).sortBy('eventType');
}

async function getLatestJournalEntryForDay(db: HealthDatabase, date: string): Promise<JournalEntry | null> {
	return (await db.journalEntries.where('localDay').equals(date).sortBy('updatedAt')).at(-1) ?? null;
}

function buildPlannedMealFromFoodSlot(
	slot: PlanSlot,
	foodCatalogItems: FoodCatalogItem[]
): TodayPlannedMealCandidate | null {
	if (slot.slotType !== 'meal' || slot.itemType !== 'food' || !slot.itemId || slot.status !== 'planned') {
		return null;
	}

	const food = foodCatalogItems.find((candidate) => candidate.id === slot.itemId);
	if (!food) {
		return null;
	}

	return {
		kind: 'plan-slot-food',
		slotId: slot.id,
		meal: {
			id: `planned-slot:${slot.id}`,
			createdAt: slot.createdAt,
			updatedAt: slot.updatedAt,
			name: slot.title,
			mealType: 'meal',
			calories: food.calories,
			protein: food.protein,
			fiber: food.fiber,
			carbs: food.carbs,
			fat: food.fat,
			sourceName: food.sourceName,
			notes: slot.notes
		}
	};
}

function deriveTodayPlannedMealCandidate(
	explicitPlannedMeal: PlannedMeal | null,
	planSlots: PlanSlot[],
	foodCatalogItems: FoodCatalogItem[]
): TodayPlannedMealResolution {
	if (explicitPlannedMeal) {
		return {
			candidate: {
				kind: 'standalone',
				meal: explicitPlannedMeal
			},
			issue: null
		};
	}

	for (const slot of planSlots) {
		const candidate = buildPlannedMealFromFoodSlot(slot, foodCatalogItems);
		if (candidate) {
			return {
				candidate,
				issue: null
			};
		}

		if (slot.slotType === 'meal' && slot.itemType === 'food' && slot.itemId && slot.status === 'planned') {
			return {
				candidate: null,
				issue: 'That planned meal no longer exists. Replace it in Plan before logging it today.'
			};
		}
	}

	return {
		candidate: null,
		issue: null
	};
}

function deriveTodayPlannedWorkout(
	planSlots: PlanSlot[],
	foodCatalogItems: FoodCatalogItem[],
	recipeCatalogItems: Awaited<ReturnType<typeof listRecipeCatalogItems>>,
	workoutTemplates: Awaited<ReturnType<typeof listWorkoutTemplates>>,
	exerciseCatalogItems: Awaited<ReturnType<typeof listExerciseCatalogItems>>
): TodayPlannedWorkout | null {
	for (const slot of planSlots) {
		if (slot.slotType !== 'workout' || slot.status !== 'planned') {
			continue;
		}

		if (slot.itemType === 'workout-template' && slot.itemId) {
			const template = workoutTemplates.find((candidate) => candidate.id === slot.itemId);
			if (!template) {
				continue;
			}
		}

		return {
			id: slot.id,
			title: slot.title,
			subtitle: createSlotSummary(
				slot,
				foodCatalogItems,
				recipeCatalogItems,
				workoutTemplates,
				exerciseCatalogItems
			),
			status: slot.status
		};
	}

	return null;
}

function deriveTodayPlannedWorkoutIssue(
	planSlots: PlanSlot[],
	workoutTemplates: Awaited<ReturnType<typeof listWorkoutTemplates>>
): string | null {
	for (const slot of planSlots) {
		if (slot.slotType !== 'workout' || slot.itemType !== 'workout-template' || !slot.itemId || slot.status !== 'planned') {
			continue;
		}

		const exists = workoutTemplates.some((template) => template.id === slot.itemId);
		if (!exists) {
			return 'That planned workout no longer exists. Replace it in Plan before using it today.';
		}
	}

	return null;
}

export async function getTodaySnapshot(db: HealthDatabase, date: string): Promise<TodaySnapshot> {
	const [dailyRecord, nutritionSummary, plannedMeal, planSlots, foodCatalogItems, recipeCatalogItems, workoutTemplates, exerciseCatalogItems, events, latestJournalEntry] = await Promise.all([
		db.dailyRecords.where('date').equals(date).first(),
		buildDailyNutritionSummary(db, date),
		getPlannedMeal(db),
		listPlanSlotsForDay(db, date),
		listFoodCatalogItems(db),
		listRecipeCatalogItems(db),
		listWorkoutTemplates(db),
		listExerciseCatalogItems(db),
		listEventsForDay(db, date),
		getLatestJournalEntryForDay(db, date)
	]);
	const planItems: TodayPlanItem[] = planSlots.map((slot) => ({
		id: slot.id,
		title: slot.title,
		subtitle: createSlotSummary(slot, foodCatalogItems, recipeCatalogItems, workoutTemplates, exerciseCatalogItems),
		status: slot.status
	}));
	const plannedMealResolution = deriveTodayPlannedMealCandidate(plannedMeal, planSlots, foodCatalogItems);
	const plannedWorkout = deriveTodayPlannedWorkout(
		planSlots,
		foodCatalogItems,
		recipeCatalogItems,
		workoutTemplates,
		exerciseCatalogItems
	);
	const plannedWorkoutIssue = plannedWorkout ? null : deriveTodayPlannedWorkoutIssue(planSlots, workoutTemplates);

	return {
		date,
		dailyRecord: dailyRecord ?? null,
		foodEntries: nutritionSummary.entries,
		nutritionSummary: {
			calories: nutritionSummary.calories,
			protein: nutritionSummary.protein,
			fiber: nutritionSummary.fiber,
			carbs: nutritionSummary.carbs,
			fat: nutritionSummary.fat
		},
		plannedMeal: plannedMealResolution.candidate?.meal ?? null,
		plannedMealIssue: plannedMealResolution.issue,
		plannedWorkout,
		plannedWorkoutIssue,
		planItems,
		events,
		latestJournalEntry
	};
}

export async function logPlannedMealForToday(
	db: HealthDatabase,
	date: string
): Promise<FoodEntry | null> {
	const [plannedMeal, planSlots, foodCatalogItems] = await Promise.all([
		getPlannedMeal(db),
		listPlanSlotsForDay(db, date),
		listFoodCatalogItems(db)
	]);
	const resolution = deriveTodayPlannedMealCandidate(plannedMeal, planSlots, foodCatalogItems);
	if (!resolution.candidate) {
		return null;
	}
	const candidate = resolution.candidate;

	const entry = await createFoodEntry(db, {
		localDay: date,
		mealType: candidate.meal.mealType,
		name: candidate.meal.name,
		calories: candidate.meal.calories,
		protein: candidate.meal.protein,
		fiber: candidate.meal.fiber,
		carbs: candidate.meal.carbs,
		fat: candidate.meal.fat,
		sourceName: candidate.meal.sourceName,
		notes: candidate.meal.notes
	});

	if (candidate.kind === 'standalone') {
		await clearPlannedMeal(db);
	}

	if (candidate.kind === 'plan-slot-food' && candidate.slotId) {
		await updatePlanSlotStatus(db, candidate.slotId, 'done');
	}
	return entry;
}

export async function clearTodayPlannedMeal(db: HealthDatabase): Promise<void> {
	await clearPlannedMeal(db);
}

export async function updateTodayPlanSlotStatus(
	db: HealthDatabase,
	slotId: string,
	status: PlanSlot['status']
): Promise<PlanSlot> {
	return await updatePlanSlotStatus(db, slotId, status);
}
