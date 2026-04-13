import type {
  TodayFallbackState,
  TodayIntelligenceInput,
  TodayIntelligenceResult,
  TodayRecommendation,
} from './intelligence';

export function buildTodayFallbackState(input: TodayIntelligenceInput): TodayFallbackState {
  if (!input.dailyRecord) {
    return {
      title: 'No strong recommendation yet.',
      message: "Start with today's check-in to unlock the rest of Today.",
      action: {
        kind: 'href',
        label: 'Open check-in',
        href: '#today-check-in',
      },
    };
  }

  return {
    title: 'No strong recommendation yet.',
    message: input.planItemsCount
      ? 'Stay with the planned day and keep logging signals.'
      : 'Keep logging signals and use the next section that matches the day.',
    action: input.planItemsCount
      ? {
          kind: 'href',
          label: 'Open Plan',
          href: '/plan',
        }
      : null,
  };
}

export function finalizeTodayIntelligence(
  primaryRecommendation: TodayRecommendation | null,
  input: TodayIntelligenceInput
): TodayIntelligenceResult {
  return {
    primaryRecommendation,
    fallbackState: primaryRecommendation ? null : buildTodayFallbackState(input),
  };
}
