import { z } from 'zod';
import type { MovementPageState } from './controller';

function isMovementPageState(value: unknown): value is MovementPageState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  const form = state.workoutTemplateForm as Record<string, unknown> | undefined;

  return (
    typeof state.loading === 'boolean' &&
    typeof state.saveNotice === 'string' &&
    Array.isArray(state.workoutTemplates) &&
    Array.isArray(state.exerciseCatalogItems) &&
    typeof state.exerciseSearchQuery === 'string' &&
    Array.isArray(state.exerciseSearchResults) &&
    form !== undefined &&
    typeof form.title === 'string' &&
    typeof form.goal === 'string' &&
    Array.isArray(form.exercises)
  );
}

const movementPageStateSchema = z.custom<MovementPageState>(isMovementPageState, {
  message: 'Invalid movement page state',
});

export const movementRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('load'),
  }),
  z.object({
    action: z.literal('saveWorkoutTemplate'),
    state: movementPageStateSchema,
  }),
]);

export type MovementRequest = z.infer<typeof movementRequestSchema>;

export const movementQueryRequestSchema = z.object({
  query: z.string().optional(),
});

export type MovementQueryRequest = z.infer<typeof movementQueryRequestSchema>;
