import type {
  ExerciseCatalogItem,
  WorkoutTemplate,
  WorkoutTemplateExerciseRef,
} from '$lib/core/domain/types';

export interface WorkoutTemplateFormState {
  title: string;
  goal: string;
  exercises: WorkoutTemplateExerciseRef[];
}

export interface ExerciseSearchRow {
  id: string;
  title: string;
  detail: string;
}

export function createWorkoutTemplateForm(): WorkoutTemplateFormState {
  return {
    title: '',
    goal: '',
    exercises: [{ name: '', reps: '' }],
  };
}

export function createExerciseSearchRows(items: ExerciseCatalogItem[]): ExerciseSearchRow[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    detail: [...item.muscleGroups, ...item.equipment].filter(Boolean).join(' · ') || 'Exercise',
  }));
}

export function addExerciseDraft(
  current: WorkoutTemplateExerciseRef[],
  exercise: ExerciseCatalogItem | string | undefined = undefined
): WorkoutTemplateExerciseRef[] {
  const title = typeof exercise === 'string' ? exercise : (exercise?.title ?? '');
  if (
    title &&
    current.some((item) => item.name.trim().toLowerCase() === title.trim().toLowerCase())
  ) {
    return current;
  }

  if (title) {
    const emptyIndex = current.findIndex((item) => !item.name.trim());
    if (emptyIndex >= 0) {
      return current.map((item, index) =>
        index === emptyIndex
          ? {
              ...item,
              name: title,
              exerciseCatalogId: typeof exercise === 'string' ? undefined : exercise?.id,
            }
          : item
      );
    }
  }

  return [
    ...current,
    {
      name: title,
      exerciseCatalogId: typeof exercise === 'string' ? undefined : exercise?.id,
      reps: '',
    },
  ];
}

export function updateExerciseDraftField(
  current: WorkoutTemplateExerciseRef[],
  index: number,
  field: keyof WorkoutTemplateExerciseRef,
  value: string
): WorkoutTemplateExerciseRef[] {
  return current.map((item, itemIndex) => {
    if (itemIndex !== index) return item;

    if (field === 'sets' || field === 'restSeconds') {
      return {
        ...item,
        [field]: value.trim() ? Number(value) : undefined,
      };
    }

    return {
      ...item,
      exerciseCatalogId: field === 'name' ? undefined : item.exerciseCatalogId,
      [field]: value,
    };
  });
}

export function removeExerciseDraft(
  current: WorkoutTemplateExerciseRef[],
  index: number
): WorkoutTemplateExerciseRef[] {
  if (current.length <= 1) {
    return [{ name: '', reps: '' }];
  }

  return current.filter((_, itemIndex) => itemIndex !== index);
}

export function normalizeExerciseDrafts(
  current: WorkoutTemplateExerciseRef[]
): WorkoutTemplateExerciseRef[] {
  return current
    .map((item) => ({
      name: item.name.trim(),
      exerciseCatalogId: item.exerciseCatalogId,
      sets: item.sets,
      reps: item.reps?.trim() || undefined,
      restSeconds: item.restSeconds,
    }))
    .filter((item) => item.name);
}

export function createWorkoutTemplateSummary(template: WorkoutTemplate): string {
  const firstExercise = template.exerciseRefs[0];
  const catalogHint = firstExercise?.exerciseCatalogId ? 'Linked exercise' : '';
  const firstExerciseSummary = firstExercise
    ? [
        firstExercise.name,
        firstExercise.sets && firstExercise.reps
          ? `${firstExercise.sets}x${firstExercise.reps}`
          : firstExercise.reps,
        firstExercise.restSeconds ? `${firstExercise.restSeconds}s rest` : '',
        catalogHint,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return [
    template.goal,
    `${template.exerciseRefs.length} exercise${template.exerciseRefs.length === 1 ? '' : 's'}`,
    firstExerciseSummary,
  ]
    .filter(Boolean)
    .join(' · ');
}
