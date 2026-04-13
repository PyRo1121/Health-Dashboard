import { z } from 'zod';
import type { ReviewPageState } from './controller';

function isReviewPageState(value: unknown): value is ReviewPageState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  const weekly = state.weekly as Record<string, unknown> | null;
  const experimentCandidates = weekly?.experimentCandidates;
  const hasValidWeeklyShape =
    state.weekly === null ||
    (typeof weekly === 'object' &&
      weekly !== null &&
      Array.isArray(weekly.experimentOptions) &&
      weekly.experimentOptions.every((option) => typeof option === 'string') &&
      (experimentCandidates === undefined ||
        (Array.isArray(experimentCandidates) &&
          experimentCandidates.every(
            (candidate) =>
              candidate &&
              typeof candidate === 'object' &&
              typeof (candidate as Record<string, unknown>).id === 'string' &&
              typeof (candidate as Record<string, unknown>).label === 'string'
          ))));

  return (
    typeof state.loading === 'boolean' &&
    typeof state.localDay === 'string' &&
    typeof state.selectedExperiment === 'string' &&
    typeof state.loadNotice === 'string' &&
    typeof state.saveNotice === 'string' &&
    hasValidWeeklyShape
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
