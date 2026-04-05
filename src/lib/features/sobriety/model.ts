import type { SobrietyEvent } from '$lib/core/domain/types';

export const sobrietyStatusActions = [
  {
    status: 'sober' as const,
    label: 'Mark sober today',
    variant: 'primary' as const,
    notice: 'Marked sober for today.',
  },
  {
    status: 'recovery' as const,
    label: 'Mark recovery mode',
    variant: 'secondary' as const,
    notice: 'Recovery status logged.',
  },
] as const;

export type SobrietyEventRow = {
  id: string;
  title: string;
  lines: string[];
  badge?: string;
};

export function formatSobrietyStreak(streak: number): string {
  return `${streak} day${streak === 1 ? '' : 's'}`;
}

export function createSobrietyEventRows(events: SobrietyEvent[]): SobrietyEventRow[] {
  return events.map((event) => ({
    id: event.id,
    title: event.eventType,
    lines: [event.note, event.recoveryAction].filter((line): line is string => Boolean(line)),
    badge: event.cravingScore !== undefined ? `${event.cravingScore}/5` : event.status || undefined,
  }));
}
