import type { HealthDatabase } from '$lib/core/db/types';
import type { ExerciseCatalogItem, WorkoutTemplate } from '$lib/core/domain/types';
import { nowIso } from '$lib/core/domain/time';
import { createRecordMeta, updateRecordMeta } from '$lib/core/shared/records';
import { createRecordId } from '$lib/core/shared/ids';

export async function upsertExerciseCatalogItem(
  db: HealthDatabase,
  input: ExerciseCatalogItem
): Promise<ExerciseCatalogItem> {
  const timestamp = nowIso();
  const existing = await db.exerciseCatalogItems.get(input.id);
  const item: ExerciseCatalogItem = {
    ...input,
    ...updateRecordMeta(existing, input.id, timestamp),
  };

  await db.exerciseCatalogItems.put(item);
  return item;
}

export async function upsertExerciseCatalogItems(
  db: HealthDatabase,
  items: ExerciseCatalogItem[]
): Promise<ExerciseCatalogItem[]> {
  const saved: ExerciseCatalogItem[] = [];
  for (const item of items) {
    saved.push(await upsertExerciseCatalogItem(db, item));
  }
  return saved;
}

export async function listExerciseCatalogItems(db: HealthDatabase): Promise<ExerciseCatalogItem[]> {
  return (await db.exerciseCatalogItems.toArray()).sort((left, right) =>
    left.title.localeCompare(right.title)
  );
}

export async function listWorkoutTemplates(db: HealthDatabase): Promise<WorkoutTemplate[]> {
  return (await db.workoutTemplates.toArray()).sort((left, right) =>
    left.title.localeCompare(right.title)
  );
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
    exerciseRefs: input.exerciseRefs,
  };

  await db.workoutTemplates.put(template);
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
