import type { HealthEvent, NativeCompanionSummary } from '$lib/core/domain/types';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { selectAllMirrorRecords } from '$lib/server/db/drizzle/mirror';
import type { IntegrationsPageState } from '$lib/features/integrations/controller';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function latestTimestamp(current: string | undefined, event: HealthEvent): string | undefined {
  const candidate =
    asString(event.payload?.capturedAt) ??
    event.sourceTimestamp ??
    event.updatedAt ??
    event.createdAt;
  if (!candidate) return current;
  if (!current) return candidate;
  return candidate > current ? candidate : current;
}

function summarizeNativeCompanionEvent(event: HealthEvent): {
  deviceName?: string;
  metricType?: string;
  latestCaptureAt?: string;
} {
  const payload = event.payload ?? {};
  return {
    deviceName: asString(payload.deviceName) ?? event.deviceId,
    metricType: asString(payload.metricType) ?? event.eventType,
    latestCaptureAt:
      asString(payload.capturedAt) ?? event.sourceTimestamp ?? event.updatedAt ?? event.createdAt,
  };
}

export async function summarizeNativeCompanionEventsServer(): Promise<NativeCompanionSummary> {
  const { db } = getServerDrizzleClient();
  const events = (await selectAllMirrorRecords<HealthEvent>(db, drizzleSchema.healthEvents)).filter(
    (event) => event.sourceType === 'native-companion'
  );
  const deviceNames = new Set<string>();
  const metricTypes = new Set<string>();
  let latestCaptureAt: string | undefined;

  for (const event of events) {
    const { deviceName, metricType } = summarizeNativeCompanionEvent(event);
    if (deviceName) deviceNames.add(deviceName);
    if (metricType) metricTypes.add(metricType);
    latestCaptureAt = latestTimestamp(latestCaptureAt, event);
  }

  return {
    importedEvents: events.length,
    deviceNames: [...deviceNames].sort(),
    metricTypes: [...metricTypes].sort(),
    latestCaptureAt,
  };
}

export async function loadIntegrationsPageServer(): Promise<IntegrationsPageState> {
  return {
    loading: false,
    summary: await summarizeNativeCompanionEventsServer(),
  };
}
