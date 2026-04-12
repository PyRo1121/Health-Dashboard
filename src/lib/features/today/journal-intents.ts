import type { HealthEvent } from '$lib/core/domain/types';
import { matchesHealthMetric } from '$lib/core/domain/health-metrics';
import type { JournalIntent } from '$lib/features/journal/navigation';

function selectLinkedRecoveryEventIds(events: HealthEvent[]): string[] {
  return events
    .filter(
      (event) =>
        matchesHealthMetric(event.eventType, 'symptom') ||
        matchesHealthMetric(event.eventType, 'anxiety-episode')
    )
    .map((event) => event.id)
    .slice(0, 3);
}

export function createTodayRecoveryJournalIntent(input: {
  date: string;
  reasons: string[];
  events: HealthEvent[];
}): JournalIntent {
  return {
    source: 'today-recovery',
    localDay: input.date,
    entryType: 'symptom_note',
    title: 'Recovery note',
    body: [
      `Recovery note for ${input.date}.`,
      '',
      'Signals noticed:',
      ...input.reasons.map((line) => `- ${line}`),
      '',
      'What felt hardest? What would make the rest of the day lighter?',
    ].join('\n'),
    linkedEventIds: selectLinkedRecoveryEventIds(input.events),
  };
}

export function createTodayContextCaptureJournalIntent(input: {
  date: string;
  events: HealthEvent[];
}): JournalIntent {
  return {
    source: 'today-recovery',
    localDay: input.date,
    entryType: 'freeform',
    title: 'Context note',
    body: 'What happened today that mattered most?',
    linkedEventIds: selectLinkedRecoveryEventIds(input.events),
  };
}
