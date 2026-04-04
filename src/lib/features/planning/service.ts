import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type {
	ExerciseCatalogItem,
	FoodCatalogItem,
	GroceryItem,
	PlanSlot,
	RecipeCatalogItem,
	WeeklyPlan,
	WorkoutTemplate
} from '$lib/core/domain/types';
import { startOfWeek } from '$lib/core/shared/dates';
import { createRecordId } from '$lib/core/shared/ids';
import { createRecordMeta, updateRecordMeta } from '$lib/core/shared/records';
import { deriveWeeklyGroceries } from '$lib/features/groceries/service';
import { listExerciseCatalogItems } from '$lib/features/movement/service';
import { listFoodCatalogItems, listRecipeCatalogItems } from '$lib/features/nutrition/service';

const DEFAULT_WEEKLY_PLAN_TITLE = 'This Week';

function weekDaysFromStart(weekStart: string): string[] {
	const first = new Date(`${weekStart}T00:00:00.000Z`);
	return Array.from({ length: 7 }, (_, index) => {
		const next = new Date(first);
		next.setUTCDate(first.getUTCDate() + index);
		return next.toISOString().slice(0, 10);
	});
}

function sortPlanSlots(slots: PlanSlot[]): PlanSlot[] {
	return [...slots].sort(
		(left, right) =>
			left.localDay.localeCompare(right.localDay) ||
			left.order - right.order ||
			left.createdAt.localeCompare(right.createdAt)
	);
}

function nextPlanSlotOrder(slots: PlanSlot[]): number {
	if (!slots.length) {
		return 0;
	}

	return Math.max(...slots.map((slot) => slot.order)) + 1;
}

async function persistOrderedSlots(db: HealthDatabase, slots: PlanSlot[]): Promise<void> {
	for (const [index, slot] of slots.entries()) {
		await db.planSlots.put({
			...slot,
			...updateRecordMeta(slot, slot.id),
			order: index
		});
	}
}

export async function ensureWeeklyPlan(db: HealthDatabase, anchorDay: string): Promise<WeeklyPlan> {
	const weekStart = startOfWeek(anchorDay);
	const existing = await db.weeklyPlans.where('weekStart').equals(weekStart).first();
	if (existing) {
		return existing;
	}

	const timestamp = nowIso();
	const plan: WeeklyPlan = {
		...createRecordMeta(createRecordId('weekly-plan'), timestamp),
		weekStart,
		title: DEFAULT_WEEKLY_PLAN_TITLE
	};

	await db.weeklyPlans.put(plan);
	return plan;
}

export async function listWeeklyPlanSlots(
	db: HealthDatabase,
	weeklyPlanId: string
): Promise<PlanSlot[]> {
	return sortPlanSlots(await db.planSlots.where('weeklyPlanId').equals(weeklyPlanId).toArray());
}

export async function listPlanSlotsForDay(
	db: HealthDatabase,
	localDay: string
): Promise<PlanSlot[]> {
	return sortPlanSlots(await db.planSlots.where('localDay').equals(localDay).toArray());
}

export async function savePlanSlot(
	db: HealthDatabase,
	input: {
		weeklyPlanId: string;
		localDay: string;
		slotType: PlanSlot['slotType'];
		itemType: PlanSlot['itemType'];
		itemId?: string;
		title: string;
		notes?: string;
	}
): Promise<PlanSlot> {
	const title = input.title.trim();
	if (!title) {
		throw new Error('Plan slot title is required');
	}

	const existingSlots = await db.planSlots
		.where('weeklyPlanId')
		.equals(input.weeklyPlanId)
		.and((slot) => slot.localDay === input.localDay)
		.toArray();
	const timestamp = nowIso();
	const slot: PlanSlot = {
		...createRecordMeta(createRecordId('plan-slot'), timestamp),
		weeklyPlanId: input.weeklyPlanId,
		localDay: input.localDay,
		slotType: input.slotType,
		itemType: input.itemType,
		itemId: input.itemId,
		title,
		notes: input.notes?.trim() || undefined,
		status: 'planned',
		order: nextPlanSlotOrder(existingSlots)
	};

	await db.planSlots.put(slot);
	return slot;
}

export async function updatePlanSlotStatus(
	db: HealthDatabase,
	slotId: string,
	status: PlanSlot['status']
): Promise<PlanSlot> {
	const existing = await db.planSlots.get(slotId);
	if (!existing) {
		throw new Error('Plan slot not found');
	}

	const slot: PlanSlot = {
		...existing,
		...updateRecordMeta(existing, existing.id),
		status
	};

	await db.planSlots.put(slot);
	return slot;
}

export async function deletePlanSlot(db: HealthDatabase, slotId: string): Promise<void> {
	const existing = await db.planSlots.get(slotId);
	await db.planSlots.delete(slotId);
	if (!existing) {
		return;
	}

	const siblings = await db.planSlots
		.where('weeklyPlanId')
		.equals(existing.weeklyPlanId)
		.and((slot) => slot.localDay === existing.localDay)
		.toArray();
	await persistOrderedSlots(db, sortPlanSlots(siblings));
}

export async function movePlanSlot(
	db: HealthDatabase,
	slotId: string,
	direction: 'up' | 'down'
): Promise<PlanSlot[]> {
	const existing = await db.planSlots.get(slotId);
	if (!existing) {
		throw new Error('Plan slot not found');
	}

	const siblings = sortPlanSlots(
		await db.planSlots
			.where('weeklyPlanId')
			.equals(existing.weeklyPlanId)
			.and((slot) => slot.localDay === existing.localDay)
			.toArray()
	);
	const currentIndex = siblings.findIndex((slot) => slot.id === slotId);
	if (currentIndex < 0) {
		throw new Error('Plan slot not found');
	}

	const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
	if (targetIndex < 0 || targetIndex >= siblings.length) {
		return siblings;
	}

	const reordered = [...siblings];
	const [moved] = reordered.splice(currentIndex, 1);
	reordered.splice(targetIndex, 0, moved!);
	await persistOrderedSlots(db, reordered);
	return await listWeeklyPlanSlots(db, existing.weeklyPlanId);
}

export async function listWorkoutTemplates(db: HealthDatabase): Promise<WorkoutTemplate[]> {
	return (await db.workoutTemplates.toArray()).sort((left, right) => left.title.localeCompare(right.title));
}

export async function saveWorkoutTemplate(
	db: HealthDatabase,
	input: {
		title: string;
		goal?: string;
		exerciseRefs: WorkoutTemplate['exerciseRefs'];
	}
): Promise<WorkoutTemplate> {
	const title = input.title.trim();
	if (!title) {
		throw new Error('Workout template title is required');
	}

	const timestamp = nowIso();
	const template: WorkoutTemplate = {
		...createRecordMeta(createRecordId('workout-template'), timestamp),
		title,
		goal: input.goal?.trim() || undefined,
		exerciseRefs: input.exerciseRefs
	};

	await db.workoutTemplates.put(template);
	return template;
}

export async function getWeeklyPlanSnapshot(db: HealthDatabase, anchorDay: string): Promise<{
	weeklyPlan: WeeklyPlan;
	weekDays: string[];
	slots: PlanSlot[];
	groceryItems: GroceryItem[];
	foodCatalogItems: FoodCatalogItem[];
	recipeCatalogItems: RecipeCatalogItem[];
	workoutTemplates: WorkoutTemplate[];
	exerciseCatalogItems: ExerciseCatalogItem[];
}> {
	const weeklyPlan = await ensureWeeklyPlan(db, anchorDay);
	const [slots, groceryItems, foodCatalogItems, recipeCatalogItems, workoutTemplates, exerciseCatalogItems] = await Promise.all([
		listWeeklyPlanSlots(db, weeklyPlan.id),
		deriveWeeklyGroceries(db, weeklyPlan.id),
		listFoodCatalogItems(db),
		listRecipeCatalogItems(db),
		listWorkoutTemplates(db),
		listExerciseCatalogItems(db)
	]);

	return {
		weeklyPlan,
		weekDays: weekDaysFromStart(weeklyPlan.weekStart),
		slots,
		groceryItems,
		foodCatalogItems,
		recipeCatalogItems,
		workoutTemplates,
		exerciseCatalogItems
	};
}
