import { nowIso } from '$lib/core/domain/time';
import type { HealthEvent, JournalEntry } from '$lib/core/domain/types';
import { createRecordId } from '$lib/core/shared/ids';
import { createRecordMeta } from '$lib/core/shared/records';

export function parseAppleHealthXml(xml: string): HealthEvent[] {
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
			sourceRecordId: `${attributes.sourceName ?? 'unknown'}:${sourceTimestamp}`,
			sourceTimestamp,
			localDay: sourceTimestamp.slice(0, 10),
			timezone: 'UTC',
			confidence: 0.95,
			eventType: attributes.type ?? 'unknown',
			value: Number(attributes.value ?? 0),
			unit: attributes.unit ?? undefined
		} satisfies HealthEvent;
	});
}

export function parseDayOneExport(json: string): JournalEntry[] {
	const parsed = JSON.parse(json) as { entries?: Array<{ creationDate?: string; text?: string; uuid?: string }> };
	const importedAt = nowIso();
	return (parsed.entries ?? []).map((entry) => {
		const timestamp = entry.creationDate ?? importedAt;
		return {
			...createRecordMeta(entry.uuid ?? createRecordId('dayone-entry'), timestamp),
			localDay: timestamp.slice(0, 10),
			entryType: 'freeform',
			title: undefined,
			body: entry.text ?? '',
			tags: ['day-one-import'],
			linkedEventIds: []
		};
	});
}
