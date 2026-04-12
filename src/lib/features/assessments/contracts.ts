import { z } from 'zod';
import type { AssessmentsPageState } from './controller';

function isAssessmentsPageState(value: unknown): value is AssessmentsPageState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;

  return (
    typeof state.loading === 'boolean' &&
    typeof state.localDay === 'string' &&
    typeof state.instrument === 'string' &&
    Array.isArray(state.draftResponses) &&
    typeof state.saveNotice === 'string' &&
    typeof state.validationError === 'string' &&
    typeof state.safetyMessage === 'string' &&
    (state.latest === undefined || state.latest === null || typeof state.latest === 'object')
  );
}

const assessmentsPageStateSchema = z.custom<AssessmentsPageState>(isAssessmentsPageState, {
  message: 'Invalid assessments page state',
});

export const assessmentsRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('load'),
    localDay: z.string(),
    state: assessmentsPageStateSchema,
  }),
  z.object({
    action: z.literal('saveProgress'),
    state: assessmentsPageStateSchema,
  }),
  z.object({
    action: z.literal('submit'),
    state: assessmentsPageStateSchema,
  }),
]);
