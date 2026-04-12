import type { HealthDbExerciseCatalogItemsStore, HealthDbWorkoutTemplatesStore } from '$lib/core/db/types';
import type { ExerciseCatalogItem, WorkoutTemplate } from '$lib/core/domain/types';
import { nowIso } from '$lib/core/domain/time';
import { createRecordMeta, updateRecordMeta } from '$lib/core/shared/records';
import { createRecordId } from '$lib/core/shared/ids';

export interface MovementStorage extends HealthDbExerciseCatalogItemsStore, HealthDbWorkoutTemplatesStore {}

export async function upsertExerciseCatalogItem(
  store: MovementStorage,
  input: ExerciseCatalogItem
): Promise<ExerciseCatalogItem> {
  const timestamp = nowIso();
  const existing = await store.exerciseCatalogItems.get(input.id);
  const item: ExerciseCatalogItem = {
    ...input,
    ...updateRecordMeta(existing, input.id, timestamp),
  };

  await store.exerciseCatalogItems.put(item);
  return item;
}

export async function upsertExerciseCatalogItems(
  store: MovementStorage,
  items: ExerciseCatalogItem[]
): Promise<ExerciseCatalogItem[]> {
  const saved: ExerciseCatalogItem[] = [];
  for (const item of items) {
    saved.push(await upsertExerciseCatalogItem(store, item));
  }
  return saved;
}

export async function listExerciseCatalogItems(
  store: MovementStorage
): Promise<ExerciseCatalogItem[]> {
  return (await store.exerciseCatalogItems.toArray()).sort((left, right) =>
    left.title.localeCompare(right.title)
  );
}

export async function listWorkoutTemplates(store: MovementStorage): Promise<WorkoutTemplate[]> {
  return (await store.workoutTemplates.toArray()).sort((left, right) =>
    left.title.localeCompare(right.title)
  );
}

export function buildWorkoutTemplateRecord(
  input: {
    title: string;
    goal?: string;
    exerciseRefs: WorkoutTemplate['exerciseRefs'];
  },
  timestamp: string = nowIso()
): WorkoutTemplate {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Workout template title is required');
  }

  return {
    ...createRecordMeta(createRecordId('workout-template'), timestamp),
    title,
    goal: input.goal?.trim() || undefined,
    exerciseRefs: input.exerciseRefs,
  };
}

export async function saveWorkoutTemplate(
  store: MovementStorage,
  input: {
    title: string;
    goal?: string;
    exerciseRefs: WorkoutTemplate['exerciseRefs'];
  }
): Promise<WorkoutTemplate> {
  const template = buildWorkoutTemplateRecord(input);

  await store.workoutTemplates.put(template);
  return template;
}

export function searchExerciseCatalog(
  query: string,
  items: ExerciseCatalogItem[]
): ExerciseCatalogItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  return items.filter((item) => {
    const haystack = [item.title, ...item.muscleGroups, ...item.equipment, item.instructions ?? '']
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  });
}
