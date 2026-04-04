import type { NativeCompanionBundle, NativeCompanionRecord } from '$lib/core/domain/types';
import { HEALTHKIT_CONNECTOR, HEALTHKIT_CONNECTOR_VERSION, isPlainObject } from './schema';

export class NativeCompanionBundleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NativeCompanionBundleError';
	}
}

function requireString(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new NativeCompanionBundleError(`${path} must be a non-empty string`);
	}

	return value;
}

function requireNumber(value: unknown, path: string): number {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		throw new NativeCompanionBundleError(`${path} must be a valid number`);
	}

	return value;
}

function validateRecord(value: unknown, index: number): NativeCompanionRecord {
	if (!isPlainObject(value)) {
		throw new NativeCompanionBundleError(`records[${index}] must be an object`);
	}

	const raw = isPlainObject(value.raw) ? value.raw : structuredClone(value);
	const metadata = isPlainObject(value.metadata) ? value.metadata : undefined;

	return {
		id: requireString(value.id, `records[${index}].id`),
		metricType: requireString(value.metricType, `records[${index}].metricType`),
		recordedAt: requireString(value.recordedAt, `records[${index}].recordedAt`),
		unit: requireString(value.unit, `records[${index}].unit`),
		value: requireNumber(value.value, `records[${index}].value`),
		startAt: value.startAt ? requireString(value.startAt, `records[${index}].startAt`) : undefined,
		endAt: value.endAt ? requireString(value.endAt, `records[${index}].endAt`) : undefined,
		metadata,
		raw
	};
}

export function validateHealthKitCompanionBundle(input: unknown): NativeCompanionBundle {
	if (!isPlainObject(input)) {
		throw new NativeCompanionBundleError('Companion bundle must be a JSON object');
	}

	if (input.connector !== HEALTHKIT_CONNECTOR) {
		throw new NativeCompanionBundleError(`connector must be "${HEALTHKIT_CONNECTOR}"`);
	}

	if (input.connectorVersion !== HEALTHKIT_CONNECTOR_VERSION) {
		throw new NativeCompanionBundleError(
			`connectorVersion ${String(input.connectorVersion)} is not supported`
		);
	}

	if (input.sourcePlatform !== 'ios') {
		throw new NativeCompanionBundleError('sourcePlatform must be "ios"');
	}

	if (!Array.isArray(input.records) || input.records.length === 0) {
		throw new NativeCompanionBundleError('records must contain at least one item');
	}

	return {
		connector: HEALTHKIT_CONNECTOR,
		connectorVersion: HEALTHKIT_CONNECTOR_VERSION,
		deviceId: requireString(input.deviceId, 'deviceId'),
		deviceName: requireString(input.deviceName, 'deviceName'),
		sourcePlatform: 'ios',
		capturedAt: requireString(input.capturedAt, 'capturedAt'),
		timezone: requireString(input.timezone, 'timezone'),
		records: input.records.map((record, index) => validateRecord(record, index))
	};
}

export function parseHealthKitCompanionBundle(rawText: string): NativeCompanionBundle {
	let parsed: unknown;

	try {
		parsed = JSON.parse(rawText);
	} catch {
		throw new NativeCompanionBundleError('Companion bundle must be valid JSON');
	}

	return validateHealthKitCompanionBundle(parsed);
}
