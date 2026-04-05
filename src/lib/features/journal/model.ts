import type { HealthEvent, JournalEntry } from '$lib/core/domain/types';
import { buildHealthEventDisplay } from '$lib/core/shared/health-events';
import type { JournalDraft } from '$lib/features/journal/service';

export const journalEntryTypeOptions = [
  { value: 'freeform', label: 'Freeform' },
  { value: 'morning_intention', label: 'Morning intention' },
  { value: 'evening_review', label: 'Evening review' },
  { value: 'craving_reflection', label: 'Craving reflection' },
  { value: 'symptom_note', label: 'Symptom note' },
  { value: 'experiment_note', label: 'Experiment note' },
] as const;

export type JournalEntryRow = {
  id: string;
  title: string;
  body: string;
  contextLabel: string;
};

export type JournalLinkedContextRow = {
  id: string;
  label: string;
  valueLabel: string;
  sourceLabel: string;
};

export function createEmptyJournalDraft(localDay: string): JournalDraft {
  return {
    localDay,
    entryType: 'freeform',
    title: '',
    body: '',
    tags: [],
    linkedEventIds: [],
  };
}

export function normalizeJournalDraft(draft: JournalDraft, localDay: string): JournalDraft {
  return {
    ...draft,
    localDay,
    title: draft.title?.trim(),
    body: draft.body.trim(),
    tags: [...draft.tags],
    linkedEventIds: [...draft.linkedEventIds],
  };
}

export function createJournalEntryRows(entries: JournalEntry[]): JournalEntryRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title || 'Untitled entry',
    body: entry.body,
    contextLabel:
      entry.linkedEventIds.length > 0
        ? `${entry.linkedEventIds.length} linked signal${entry.linkedEventIds.length === 1 ? '' : 's'}`
        : '',
  }));
}

export function createJournalLinkedContextRows(events: HealthEvent[]): JournalLinkedContextRow[] {
  return events.map((event) => ({
    id: event.id,
    ...buildHealthEventDisplay(event),
  }));
}
