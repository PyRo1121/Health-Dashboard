import { getConnectorSupportedMetricTypes } from '$lib/core/domain/health-metrics';

export const HEALTHKIT_CONNECTOR = 'healthkit-ios' as const;
export const HEALTHKIT_CONNECTOR_VERSION = 1;

export const HEALTHKIT_SUPPORTED_METRICS = getConnectorSupportedMetricTypes(HEALTHKIT_CONNECTOR);

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
