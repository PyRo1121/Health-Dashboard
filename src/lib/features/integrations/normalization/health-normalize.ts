import { nowIso, toLocalDay } from '$lib/core/domain/time';
import {
  isConnectorMetricSupported,
} from '$lib/core/domain/health-metrics';
import type {
  HealthEvent,
  NativeCompanionBundle,
  NativeCompanionRecord,
} from '$lib/core/domain/types';
import { createRecordId } from '$lib/core/shared/ids';
import { createRecordMeta } from '$lib/core/shared/records';

function sourceRecordId(bundle: NativeCompanionBundle, record: NativeCompanionRecord): string {
  return `${bundle.connector}:${bundle.deviceId}:${record.id}`;
}

export function normalizeHealthKitBundle(bundle: NativeCompanionBundle): {
  events: HealthEvent[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const events: HealthEvent[] = [];
  const importedAt = nowIso();

  for (const record of bundle.records) {
    if (!isConnectorMetricSupported(bundle.connector, record.metricType)) {
      warnings.push(`Skipped unsupported HealthKit metric "${record.metricType}".`);
      continue;
    }

    const sourceTimestamp = record.endAt ?? record.recordedAt;
    events.push({
      ...createRecordMeta(createRecordId('native-health'), importedAt),
      sourceType: 'native-companion',
      sourceApp: `HealthKit Companion · ${bundle.deviceName}`,
      sourceRecordId: sourceRecordId(bundle, record),
      sourceTimestamp,
      localDay: toLocalDay(sourceTimestamp, bundle.timezone),
      timezone: bundle.timezone,
      connector: bundle.connector,
      connectorVersion: bundle.connectorVersion,
      deviceId: bundle.deviceId,
      sourcePlatform: bundle.sourcePlatform,
      confidence: 0.98,
      eventType: record.metricType,
      value: record.value,
      unit: record.unit,
      payload: {
        connector: bundle.connector,
        connectorVersion: bundle.connectorVersion,
        deviceId: bundle.deviceId,
        deviceName: bundle.deviceName,
        sourcePlatform: bundle.sourcePlatform,
        capturedAt: bundle.capturedAt,
        metricType: record.metricType,
        startAt: record.startAt,
        endAt: record.endAt,
        metadata: record.metadata,
        raw: record.raw,
      },
    });
  }

  return { events, warnings };
}
