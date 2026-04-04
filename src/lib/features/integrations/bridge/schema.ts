export const HEALTHKIT_CONNECTOR = 'healthkit-ios' as const;
export const HEALTHKIT_CONNECTOR_VERSION = 1;

export const HEALTHKIT_SUPPORTED_METRICS = [
	'sleep-duration',
	'step-count',
	'resting-heart-rate',
] as const;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
