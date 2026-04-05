import { z } from 'zod';
import type { PlanningPageState } from './controller';

const planSlotStatusSchema = z.enum(['planned', 'done', 'skipped']);
const planSlotTypeSchema = z.enum(['meal', 'workout', 'note']);
const moveDirectionSchema = z.enum(['up', 'down']);

function isPlanningPageState(value: unknown): value is PlanningPageState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  const slotForm = state.slotForm as Record<string, unknown> | undefined;
  const workoutTemplateForm = state.workoutTemplateForm as Record<string, unknown> | undefined;

  return (
    typeof state.localDay === 'string' &&
    typeof state.planNotice === 'string' &&
    typeof state.workoutTemplateNotice === 'string' &&
    typeof state.groceryNotice === 'string' &&
    typeof state.loading === 'boolean' &&
    Array.isArray(state.weekDays) &&
    Array.isArray(state.slots) &&
    Array.isArray(state.groceryItems) &&
    Array.isArray(state.groceryWarnings) &&
    Array.isArray(state.exerciseCatalogItems) &&
    Array.isArray(state.foodCatalogItems) &&
    Array.isArray(state.recipeCatalogItems) &&
    Array.isArray(state.workoutTemplates) &&
    typeof state.exerciseSearchQuery === 'string' &&
    Array.isArray(state.exerciseSearchResults) &&
    slotForm !== undefined &&
    typeof slotForm.localDay === 'string' &&
    typeof slotForm.slotType === 'string' &&
    typeof slotForm.mealSource === 'string' &&
    typeof slotForm.recipeId === 'string' &&
    typeof slotForm.foodCatalogItemId === 'string' &&
    typeof slotForm.workoutTemplateId === 'string' &&
    typeof slotForm.title === 'string' &&
    typeof slotForm.notes === 'string' &&
    workoutTemplateForm !== undefined &&
    typeof workoutTemplateForm.title === 'string' &&
    typeof workoutTemplateForm.goal === 'string' &&
    Array.isArray(workoutTemplateForm.exercises)
  );
}

const planningPageStateSchema = z.custom<PlanningPageState>(isPlanningPageState, {
  message: 'Invalid planning page state',
});

export const planningRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('load'),
    localDay: z.string(),
    state: planningPageStateSchema.optional(),
  }),
  z.object({
    action: z.literal('saveSlot'),
    state: planningPageStateSchema,
  }),
  z.object({
    action: z.literal('saveWorkoutTemplate'),
    state: planningPageStateSchema,
  }),
  z.object({
    action: z.literal('markSlotStatus'),
    state: planningPageStateSchema,
    slotId: z.string(),
    status: planSlotStatusSchema,
  }),
  z.object({
    action: z.literal('moveSlot'),
    state: planningPageStateSchema,
    slotId: z.string(),
    direction: moveDirectionSchema,
  }),
  z.object({
    action: z.literal('deleteSlot'),
    state: planningPageStateSchema,
    slotId: z.string(),
  }),
  z.object({
    action: z.literal('toggleGrocery'),
    state: planningPageStateSchema,
    itemId: z.string(),
    patch: z.object({
      checked: z.boolean(),
      excluded: z.boolean(),
      onHand: z.boolean(),
    }),
  }),
  z.object({
    action: z.literal('addManualGrocery'),
    state: planningPageStateSchema,
    draft: z.object({
      label: z.string(),
      quantityText: z.string(),
    }),
  }),
  z.object({
    action: z.literal('removeManualGrocery'),
    state: planningPageStateSchema,
    itemId: z.string(),
  }),
]);

export type PlanningRequest = z.infer<typeof planningRequestSchema>;

export const plannerWriteSchemas = {
  planSlotStatusSchema,
  planSlotTypeSchema,
  moveDirectionSchema,
};
