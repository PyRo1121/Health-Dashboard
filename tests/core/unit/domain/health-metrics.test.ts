import { describe, expect, it } from 'vitest';
import {
  formatHealthMetricLabel,
  formatHealthMetricValue,
  getConnectorSupportedMetricTypes,
  getHealthMetricDefinition,
  isConnectorMetricSupported,
  isHealthMetricVisibleOnSurface,
} from '$lib/core/domain/health-metrics';

describe('health metrics registry', () => {
  it('provides labels and surfaces for current metrics', () => {
    expect(getHealthMetricDefinition('sleep-duration')).toMatchObject({
      label: 'Sleep duration',
      category: 'recovery',
      surfaces: expect.objectContaining({ health: true, timeline: true, review: true }),
    });
    expect(getHealthMetricDefinition('anxiety-episode')).toMatchObject({
      label: 'Anxiety episode',
      category: 'manual',
      surfaces: expect.objectContaining({ health: true, today: true }),
    });
  });

  it('reports connector support from the registry', () => {
    expect(getConnectorSupportedMetricTypes('healthkit-ios')).toEqual([
      'sleep-duration',
      'step-count',
      'resting-heart-rate',
    ]);
    expect(isConnectorMetricSupported('healthkit-ios', 'sleep-duration')).toBe(true);
    expect(isConnectorMetricSupported('healthkit-ios', 'oxygen-saturation')).toBe(false);
  });

  it('formats labels and values through registry helpers', () => {
    expect(formatHealthMetricLabel('HKQuantityTypeIdentifierStepCount')).toBe('Step count');
    expect(formatHealthMetricLabel('unknown-event')).toBe('unknown-event');
    expect(formatHealthMetricValue(8, 'hours')).toBe('8 hours');
    expect(formatHealthMetricValue(57, 'bpm')).toBe('57 bpm');
  });

  it('tracks surface visibility for current and future metrics', () => {
    expect(isHealthMetricVisibleOnSurface('sleep-duration', 'health')).toBe(true);
    expect(isHealthMetricVisibleOnSurface('step-count', 'health')).toBe(false);
    expect(isHealthMetricVisibleOnSurface('resting-heart-rate', 'review')).toBe(true);
    expect(isHealthMetricVisibleOnSurface('vo2-max', 'review')).toBe(true);
  });
});
