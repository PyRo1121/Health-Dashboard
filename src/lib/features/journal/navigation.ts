import type { JournalEntry } from '$lib/core/domain/types';

export interface JournalIntent {
  source: 'today-recovery' | 'review-context';
  localDay: string;
  entryType: JournalEntry['entryType'];
  title: string;
  body: string;
  linkedEventIds: string[];
}

export type JournalIntentHref = `/journal?${string}`;

export function buildJournalIntentHref(intent: JournalIntent): JournalIntentHref {
  const params = new URLSearchParams({
    source: intent.source,
    localDay: intent.localDay,
    entryType: intent.entryType,
    title: intent.title,
    body: intent.body,
  });

  if (intent.linkedEventIds.length) {
    params.set('linkedEventIds', intent.linkedEventIds.join(','));
  }

  return `/journal?${params.toString()}` as JournalIntentHref;
}

export function readJournalIntentFromSearch(search: string): JournalIntent | null {
  const params = new URLSearchParams(search);
  const source = params.get('source');
  const localDay = params.get('localDay')?.trim();
  const entryType = params.get('entryType') as JournalEntry['entryType'] | null;
  const title = params.get('title')?.trim();
  const body = params.get('body')?.trim();
  const linkedEventIds = (params.get('linkedEventIds') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allowedSources = new Set<JournalIntent['source']>(['today-recovery', 'review-context']);
  const allowedEntryTypes = new Set<JournalIntent['entryType']>([
    'freeform',
    'morning_intention',
    'evening_review',
    'craving_reflection',
    'lapse_reflection',
    'symptom_note',
    'experiment_note',
    'provider_visit_note',
  ]);

  if (
    !source ||
    !allowedSources.has(source as JournalIntent['source']) ||
    !localDay ||
    !entryType ||
    !allowedEntryTypes.has(entryType) ||
    !title ||
    !body
  ) {
    return null;
  }

  return {
    source: source as JournalIntent['source'],
    localDay,
    entryType,
    title,
    body,
    linkedEventIds,
  };
}

export function clearJournalIntentFromLocation(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
  history: Pick<History, 'replaceState' | 'state'>
): void {
  const params = new URLSearchParams(location.search);
  params.delete('source');
  params.delete('localDay');
  params.delete('entryType');
  params.delete('title');
  params.delete('body');
  params.delete('linkedEventIds');

  const nextSearch = params.toString();
  const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}${location.hash ?? ''}`;

  history.replaceState(history.state, '', nextUrl);
}
