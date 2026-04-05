import { describe, expect, it } from 'vitest';
import type { HealthEvent, SourceType } from '$lib/core/domain/types';
import { humanizeSourceType, listTimelineEvents } from '$lib/features/timeline/service';
import { useTestHealthDb } from '../../../support/unit/testDb';

function buildHealthEvent(input: {
  id: string;
  eventType: string;
  sourceType: SourceType;
  sourceTimestamp?: string;
  updatedAt?: string;
  createdAt?: string;
  value?: number | string | boolean;
  unit?: string;
  sourceApp?: string;
  localDay?: string;
  payload?: Record<string, unknown>;
  deviceId?: string;
}): HealthEvent {
  return {
    id: input.id,
    createdAt: input.createdAt ?? '2026-04-02T08:00:00Z',
    updatedAt: input.updatedAt ?? input.createdAt ?? '2026-04-02T08:00:00Z',
    sourceType: input.sourceType,
    sourceApp: input.sourceApp ?? 'Test source',
    sourceTimestamp: input.sourceTimestamp,
    localDay: input.localDay ?? '2026-04-02',
    confidence: 1,
    deviceId: input.deviceId,
    eventType: input.eventType,
    value: input.value,
    unit: input.unit,
    payload: input.payload,
  };
}

describe('timeline service', () => {
  const getDb = useTestHealthDb('timeline-service');

  it('humanizes stored source types for the UI', () => {
    expect(humanizeSourceType('native-companion')).toBe('Native companion');
    expect(humanizeSourceType('manual')).toBe('Manual');
  });

  it('sorts newest events first and formats labels for the timeline', async () => {
    const db = getDb();
    await db.healthEvents.bulkAdd([
      buildHealthEvent({
        id: 'manual-mood',
        eventType: 'mood',
        sourceType: 'manual',
        sourceTimestamp: '2026-04-02T08:00:00Z',
        value: 4,
        sourceApp: 'Daily check-in',
      }),
      buildHealthEvent({
        id: 'import-steps',
        eventType: 'step-count',
        sourceType: 'import',
        sourceTimestamp: '2026-04-02T07:30:00Z',
        value: 1200,
        unit: 'count',
        sourceApp: 'Apple Health XML',
      }),
      buildHealthEvent({
        id: 'native-rhr',
        eventType: 'resting-heart-rate',
        sourceType: 'native-companion',
        updatedAt: '2026-04-02T11:00:00Z',
        value: 57,
        unit: 'bpm',
        sourceApp: 'HealthKit Companion · Pyro iPhone',
      }),
    ]);

    const items = await listTimelineEvents(db);

    expect(items.map((item) => item.event.id)).toEqual([
      'native-rhr',
      'manual-mood',
      'import-steps',
    ]);
    expect(items[0]).toMatchObject({
      label: 'Resting heart rate',
      valueLabel: '57 bpm',
      sourceLabel: 'Native companion',
    });
    expect(items[1]).toMatchObject({
      label: 'mood',
      valueLabel: '4',
      sourceLabel: 'Manual',
    });
  });

  it('filters the timeline down to the selected source', async () => {
    const db = getDb();
    await db.healthEvents.bulkAdd([
      buildHealthEvent({
        id: 'native-sleep',
        eventType: 'sleep-duration',
        sourceType: 'native-companion',
        sourceTimestamp: '2026-04-02T12:30:00Z',
        value: 8,
        unit: 'hours',
      }),
      buildHealthEvent({
        id: 'import-steps',
        eventType: 'step-count',
        sourceType: 'import',
        sourceTimestamp: '2026-04-02T12:00:00Z',
        value: 8400,
        unit: 'count',
      }),
    ]);

    const items = await listTimelineEvents(db, 'native-companion');

    expect(items).toHaveLength(1);
    expect(items[0]?.event.id).toBe('native-sleep');
    expect(items[0]?.valueLabel).toBe('8 hours');
  });
});
