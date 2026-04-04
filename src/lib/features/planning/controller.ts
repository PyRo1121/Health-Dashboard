import type { HealthDatabase } from '$lib/core/db/types';
import type {
	ExerciseCatalogItem,
	GroceryItem,
	PlanSlot,
	WeeklyPlan,
	WorkoutTemplateExerciseRef
} from '$lib/core/domain/types';
import {
	addExerciseDraft,
	createPlanningSlotForm,
	createWorkoutTemplateForm,
	normalizeExerciseDrafts,
	removeExerciseDraft,
	type PlanningSlotFormState,
	updateExerciseDraftField,
	type WorkoutTemplateFormState
} from './model';
import {
	deletePlanSlot,
	getWeeklyPlanSnapshot,
	movePlanSlot,
	savePlanSlot,
	saveWorkoutTemplate,
	updatePlanSlotStatus
} from './service';
import { setGroceryItemState } from '$lib/features/groceries/service';

export interface PlanningPageState {
	loading: boolean;
	localDay: string;
	saveNotice: string;
	weeklyPlan: WeeklyPlan | null;
	weekDays: string[];
	slots: PlanSlot[];
	groceryItems: GroceryItem[];
	exerciseCatalogItems: ExerciseCatalogItem[];
	foodCatalogItems: import('$lib/core/domain/types').FoodCatalogItem[];
	recipeCatalogItems: import('$lib/core/domain/types').RecipeCatalogItem[];
	workoutTemplates: import('$lib/core/domain/types').WorkoutTemplate[];
	exerciseSearchQuery: string;
	exerciseSearchResults: ExerciseCatalogItem[];
	slotForm: PlanningSlotFormState;
	workoutTemplateForm: WorkoutTemplateFormState;
}

export function createPlanningPageState(): PlanningPageState {
	return {
		loading: true,
		localDay: '',
		saveNotice: '',
		weeklyPlan: null,
		weekDays: [],
		slots: [],
		groceryItems: [],
		exerciseCatalogItems: [],
		foodCatalogItems: [],
		recipeCatalogItems: [],
		workoutTemplates: [],
		exerciseSearchQuery: '',
		exerciseSearchResults: [],
		slotForm: createPlanningSlotForm(''),
		workoutTemplateForm: createWorkoutTemplateForm()
	};
}

export async function loadPlanningPage(
	db: HealthDatabase,
	localDay: string,
	state: PlanningPageState
): Promise<PlanningPageState> {
	const snapshot = await getWeeklyPlanSnapshot(db, localDay);
	return {
		...state,
		loading: false,
		localDay,
		weeklyPlan: snapshot.weeklyPlan,
		weekDays: snapshot.weekDays,
		slots: snapshot.slots,
		groceryItems: snapshot.groceryItems,
		exerciseCatalogItems: snapshot.exerciseCatalogItems,
		foodCatalogItems: snapshot.foodCatalogItems,
		recipeCatalogItems: snapshot.recipeCatalogItems,
		workoutTemplates: snapshot.workoutTemplates,
		slotForm: state.slotForm.localDay
			? {
					...state.slotForm,
					localDay: state.slotForm.localDay
				}
			: createPlanningSlotForm(localDay)
	};
}

async function reloadPlanningPageState(
	db: HealthDatabase,
	state: PlanningPageState,
	overrides: Partial<PlanningPageState> = {}
): Promise<PlanningPageState> {
	const next = await loadPlanningPage(db, state.localDay, state);
	return {
		...next,
		...overrides
	};
}

export function updateExerciseSearchQuery(
	state: PlanningPageState,
	exerciseSearchQuery: string
): PlanningPageState {
	return {
		...state,
		exerciseSearchQuery
	};
}

export function applyExerciseSearchResults(
	state: PlanningPageState,
	results: ExerciseCatalogItem[]
): PlanningPageState {
	return {
		...state,
		exerciseSearchResults: results
	};
}

export function addExerciseToWorkoutTemplate(
	state: PlanningPageState,
	exercise: ExerciseCatalogItem
): PlanningPageState {
	return {
		...state,
		workoutTemplateForm: {
			...state.workoutTemplateForm,
			exercises: addExerciseDraft(state.workoutTemplateForm.exercises, exercise)
		}
	};
}

export function addEmptyExerciseToWorkoutTemplate(
	state: PlanningPageState
): PlanningPageState {
	return {
		...state,
		workoutTemplateForm: {
			...state.workoutTemplateForm,
			exercises: addExerciseDraft(state.workoutTemplateForm.exercises)
		}
	};
}

export function updateWorkoutTemplateExerciseField(
	state: PlanningPageState,
	index: number,
	field: keyof WorkoutTemplateExerciseRef,
	value: string
): PlanningPageState {
	return {
		...state,
		workoutTemplateForm: {
			...state.workoutTemplateForm,
			exercises: updateExerciseDraftField(state.workoutTemplateForm.exercises, index, field, value)
		}
	};
}

export function removeWorkoutTemplateExercise(
	state: PlanningPageState,
	index: number
): PlanningPageState {
	return {
		...state,
		workoutTemplateForm: {
			...state.workoutTemplateForm,
			exercises: removeExerciseDraft(state.workoutTemplateForm.exercises, index)
		}
	};
}

export async function savePlanningSlotPage(
	db: HealthDatabase,
	state: PlanningPageState
): Promise<PlanningPageState> {
	if (!state.weeklyPlan) {
		return state;
	}

	const slotType = state.slotForm.slotType;
	if (slotType === 'meal') {
		if (state.slotForm.mealSource === 'recipe' && !state.slotForm.recipeId) {
			return {
				...state,
				saveNotice: 'Choose a recipe before adding a meal slot.'
			};
		}

		if (state.slotForm.mealSource === 'food' && !state.slotForm.foodCatalogItemId) {
			return {
				...state,
				saveNotice: 'Choose a saved food before adding a meal slot.'
			};
		}
	}

	if (slotType === 'workout' && !state.slotForm.workoutTemplateId) {
		return {
			...state,
			saveNotice: 'Choose a workout template before adding a workout slot.'
		};
	}

	let title = state.slotForm.title.trim();
	let itemType: PlanSlot['itemType'] = 'freeform';
	let itemId: string | undefined;

	if (slotType === 'meal') {
		if (state.slotForm.mealSource === 'recipe') {
			const recipe = await db.recipeCatalogItems.get(state.slotForm.recipeId);
			if (!recipe) {
				return {
					...state,
					saveNotice: 'That recipe no longer exists. Choose another before adding it to the week.'
				};
			}
			title = recipe.title;
			itemType = 'recipe';
			itemId = recipe.id;
		} else {
			const food = await db.foodCatalogItems.get(state.slotForm.foodCatalogItemId);
			if (!food) {
				return {
					...state,
					saveNotice: 'That saved food no longer exists. Choose another before adding it to the week.'
				};
			}
			title = food.name;
			itemType = 'food';
			itemId = food.id;
		}
	}

	if (slotType === 'workout') {
		const template = await db.workoutTemplates.get(state.slotForm.workoutTemplateId);
		if (!template) {
			return {
				...state,
				saveNotice: 'That workout template no longer exists. Choose another before adding it to the week.'
			};
		}
		title = template.title;
		itemType = 'workout-template';
		itemId = template.id;
	}

	await savePlanSlot(db, {
		weeklyPlanId: state.weeklyPlan.id,
		localDay: state.slotForm.localDay,
		slotType,
		itemType,
		itemId,
		title,
		notes: state.slotForm.notes
	});

	return await reloadPlanningPageState(db, state, {
		saveNotice: 'Plan slot saved.',
		slotForm: createPlanningSlotForm(state.slotForm.localDay)
	});
}

export async function saveWorkoutTemplatePage(
	db: HealthDatabase,
	state: PlanningPageState
): Promise<PlanningPageState> {
	const exerciseRefs = normalizeExerciseDrafts(state.workoutTemplateForm.exercises);
	await saveWorkoutTemplate(db, {
		title: state.workoutTemplateForm.title,
		goal: state.workoutTemplateForm.goal,
		exerciseRefs
	});

	return await reloadPlanningPageState(db, state, {
		saveNotice: 'Workout template saved.',
		workoutTemplateForm: createWorkoutTemplateForm()
	});
}

export async function markPlanningSlotStatusPage(
	db: HealthDatabase,
	state: PlanningPageState,
	slotId: string,
	status: PlanSlot['status']
): Promise<PlanningPageState> {
	await updatePlanSlotStatus(db, slotId, status);
	return await reloadPlanningPageState(db, state, {
		saveNotice: `Plan slot marked ${status}.`
	});
}

export async function deletePlanningSlotPage(
	db: HealthDatabase,
	state: PlanningPageState,
	slotId: string
): Promise<PlanningPageState> {
	await deletePlanSlot(db, slotId);
	return await reloadPlanningPageState(db, state, {
		saveNotice: 'Plan slot removed.'
	});
}

export async function movePlanningSlotPage(
	db: HealthDatabase,
	state: PlanningPageState,
	slotId: string,
	direction: 'up' | 'down'
): Promise<PlanningPageState> {
	await movePlanSlot(db, slotId, direction);
	return await reloadPlanningPageState(db, state, {
		saveNotice: `Plan slot moved ${direction}.`
	});
}

export async function togglePlanningGroceryStatePage(
	db: HealthDatabase,
	state: PlanningPageState,
	itemId: string,
	patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
): Promise<PlanningPageState> {
	await setGroceryItemState(db, itemId, patch);
	return await reloadPlanningPageState(db, state, {
		saveNotice: 'Grocery item updated.'
	});
}
