import type { HealthDatabase } from '$lib/core/db/types';
import type {
  ExerciseCatalogItem,
  GroceryItem,
  WeeklyPlan,
  WorkoutTemplate,
} from '$lib/core/domain/types';
import { migrateLegacyPlannedMealToPlanSlot } from '$lib/features/nutrition/migration';
import { createPlanningSlotForm, type PlanningSlotFormState } from './model';
import { getWeeklyPlanSnapshot } from './service';
import {
  createWorkoutTemplateForm,
  type WorkoutTemplateFormState,
} from '$lib/features/movement/model';
import {
  addEmptyExerciseToWorkoutTemplateState,
  addExerciseToWorkoutTemplateState,
  applyExerciseSearchResultsState,
  removeWorkoutTemplateExerciseState,
  updateExerciseSearchQueryState,
  updateWorkoutTemplateExerciseFieldState,
} from '$lib/features/movement/studio-state';

export interface PlanningPageState {
  loading: boolean;
  localDay: string;
  planNotice: string;
  workoutTemplateNotice: string;
  groceryNotice: string;
  weeklyPlan: WeeklyPlan | null;
  weekDays: string[];
  slots: import('$lib/core/domain/types').PlanSlot[];
  groceryItems: GroceryItem[];
  groceryWarnings: string[];
  exerciseCatalogItems: ExerciseCatalogItem[];
  foodCatalogItems: import('$lib/core/domain/types').FoodCatalogItem[];
  recipeCatalogItems: import('$lib/core/domain/types').RecipeCatalogItem[];
  workoutTemplates: WorkoutTemplate[];
  exerciseSearchQuery: string;
  exerciseSearchResults: ExerciseCatalogItem[];
  slotForm: PlanningSlotFormState;
  workoutTemplateForm: WorkoutTemplateFormState;
}

function emptyPlanningNotices() {
  return {
    planNotice: '',
    workoutTemplateNotice: '',
    groceryNotice: '',
  };
}

export function createPlanningPageState(): PlanningPageState {
  return {
    loading: true,
    localDay: '',
    ...emptyPlanningNotices(),
    weeklyPlan: null,
    weekDays: [],
    slots: [],
    groceryItems: [],
    groceryWarnings: [],
    exerciseCatalogItems: [],
    foodCatalogItems: [],
    recipeCatalogItems: [],
    workoutTemplates: [],
    exerciseSearchQuery: '',
    exerciseSearchResults: [],
    slotForm: createPlanningSlotForm(''),
    workoutTemplateForm: createWorkoutTemplateForm(),
  };
}

export async function loadPlanningPage(
  db: HealthDatabase,
  localDay: string,
  state: PlanningPageState
): Promise<PlanningPageState> {
  const migration = await migrateLegacyPlannedMealToPlanSlot(db, localDay);
  const snapshot = await getWeeklyPlanSnapshot(db, localDay);
  return {
    ...state,
    ...emptyPlanningNotices(),
    loading: false,
    localDay,
    planNotice: migration.notice ?? '',
    weeklyPlan: snapshot.weeklyPlan,
    weekDays: snapshot.weekDays,
    slots: snapshot.slots,
    groceryItems: snapshot.groceryItems,
    groceryWarnings: snapshot.groceryWarnings,
    exerciseCatalogItems: snapshot.exerciseCatalogItems,
    foodCatalogItems: snapshot.foodCatalogItems,
    recipeCatalogItems: snapshot.recipeCatalogItems,
    workoutTemplates: snapshot.workoutTemplates,
    slotForm: state.slotForm.localDay
      ? {
          ...state.slotForm,
          localDay: state.slotForm.localDay,
        }
      : createPlanningSlotForm(localDay),
  };
}

export async function reloadPlanningPageState(
  db: HealthDatabase,
  state: PlanningPageState,
  overrides: Partial<PlanningPageState> = {}
): Promise<PlanningPageState> {
  const next = await loadPlanningPage(db, state.localDay, state);
  return {
    ...next,
    ...overrides,
  };
}

export function updateExerciseSearchQuery(
  state: PlanningPageState,
  exerciseSearchQuery: string
): PlanningPageState {
  return updateExerciseSearchQueryState(state, exerciseSearchQuery);
}

export function applyExerciseSearchResults(
  state: PlanningPageState,
  results: ExerciseCatalogItem[]
): PlanningPageState {
  return applyExerciseSearchResultsState(state, results);
}

export function addExerciseToWorkoutTemplate(
  state: PlanningPageState,
  exercise: ExerciseCatalogItem
): PlanningPageState {
  return addExerciseToWorkoutTemplateState(state, exercise);
}

export function addEmptyExerciseToWorkoutTemplate(state: PlanningPageState): PlanningPageState {
  return addEmptyExerciseToWorkoutTemplateState(state);
}

export function updateWorkoutTemplateExerciseField(
  state: PlanningPageState,
  index: number,
  field: keyof import('$lib/core/domain/types').WorkoutTemplateExerciseRef,
  value: string
): PlanningPageState {
  return updateWorkoutTemplateExerciseFieldState(state, index, field, value);
}

export function removeWorkoutTemplateExercise(
  state: PlanningPageState,
  index: number
): PlanningPageState {
  return removeWorkoutTemplateExerciseState(state, index);
}
