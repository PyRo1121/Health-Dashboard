import { nowIso } from '$lib/core/domain/time';
import type { BaseRecord, IsoDateTime } from '$lib/core/domain/types';

type RecordMeta = Pick<BaseRecord, 'id' | 'createdAt' | 'updatedAt'>;
type ExistingRecordMeta = Pick<BaseRecord, 'id' | 'createdAt'> | null | undefined;

export function createRecordMeta(id: string, timestamp: IsoDateTime = nowIso()): RecordMeta {
	return {
		id,
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

export function updateRecordMeta(
	existing: ExistingRecordMeta,
	fallbackId: string,
	timestamp: IsoDateTime = nowIso()
): RecordMeta {
	return {
		id: existing?.id ?? fallbackId,
		createdAt: existing?.createdAt ?? timestamp,
		updatedAt: timestamp
	};
}
