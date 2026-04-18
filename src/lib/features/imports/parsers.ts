import { getCanonicalHealthMetricKey } from '$lib/core/domain/health-metrics';
import { nowIso, resolvedTimeZone, toLocalDay } from '$lib/core/domain/time';
import type { HealthEvent, JournalEntry } from '$lib/core/domain/types';
import { createRecordId } from '$lib/core/shared/ids';
import { createRecordMeta } from '$lib/core/shared/records';

function buildAppleHealthSourceRecordId(
  attributes: Record<string, string>,
  sourceTimestamp: string
): string {
  const sourceName = attributes.sourceName?.trim() || 'unknown';
  const metricType = attributes.type?.trim() || 'unknown';
  const endTimestamp = attributes.endDate?.trim() || sourceTimestamp;
  const unit = attributes.unit?.trim() || '';
  const value = attributes.value?.trim() || '';
  return `${sourceName}:${metricType}:${sourceTimestamp}:${endTimestamp}:${unit}:${value}`;
}

export function parseAppleHealthXml(xml: string, timeZone = resolvedTimeZone()): HealthEvent[] {
  const recordMatches = [...xml.matchAll(/<Record\s+([^>]+?)\s*\/?>/g)];
  const importedAt = nowIso();

  return recordMatches.map(([, attrs]) => {
    const attributes = Object.fromEntries(
      [...attrs.matchAll(/([A-Za-z0-9:_-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value])
    );
    const sourceTimestamp = attributes.startDate ?? importedAt;

    return {
      ...createRecordMeta(createRecordId('apple-import'), importedAt),
      sourceType: 'import',
      sourceApp: 'Apple Health XML',
      sourceRecordId: buildAppleHealthSourceRecordId(attributes, sourceTimestamp),
      sourceTimestamp,
      localDay: toLocalDay(sourceTimestamp, timeZone),
      timezone: timeZone,
      confidence: 0.95,
      eventType: getCanonicalHealthMetricKey(attributes.type ?? 'unknown'),
      value: Number(attributes.value ?? 0),
      unit: attributes.unit ?? undefined,
    } satisfies HealthEvent;
  });
}

export function parseDayOneExport(json: string, timeZone = resolvedTimeZone()): JournalEntry[] {
  const parsed = JSON.parse(json) as {
    entries?: Array<{ creationDate?: string; text?: string; uuid?: string }>;
  };
  const importedAt = nowIso();
  return (parsed.entries ?? []).map((entry) => {
    const timestamp = entry.creationDate ?? importedAt;
    return {
      ...createRecordMeta(entry.uuid ?? createRecordId('dayone-entry'), timestamp),
      localDay: toLocalDay(timestamp, timeZone),
      entryType: 'freeform',
      title: undefined,
      body: entry.text ?? '',
      tags: ['day-one-import'],
      linkedEventIds: [],
    };
  });
}
