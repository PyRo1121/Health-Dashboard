import { z } from 'zod';
import type { ReviewPageState } from './controller';

function isReviewPageState(value: unknown): value is ReviewPageState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;

  return (
    typeof state.loading === 'boolean' &&
    typeof state.localDay === 'string' &&
    typeof state.selectedExperiment === 'string' &&
    typeof state.loadNotice === 'string' &&
    typeof state.saveNotice === 'string' &&
    (state.weekly === null || (typeof state.weekly === 'object' && state.weekly !== null))
  );
}

const reviewPageStateSchema = z.custom<ReviewPageState>(isReviewPageState, {
  message: 'Invalid review page state',
});

export const reviewRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('load'),
    localDay: z.string(),
  }),
  z.object({
    action: z.literal('saveExperiment'),
    state: reviewPageStateSchema,
  }),
]);

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
