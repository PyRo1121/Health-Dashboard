import type { NativeCompanionConnector } from '$lib/core/domain/types';

export type HealthMetricSurface = 'health' | 'timeline' | 'today' | 'review';
export type HealthMetricCategory =
  | 'checkin'
  | 'manual'
  | 'recovery'
  | 'fitness'
  | 'body'
  | 'clinical';

export interface HealthMetricDefinition {
  key: string;
  label: string;
  category: HealthMetricCategory;
  unit?: string;
  connectors: NativeCompanionConnector[];
  aliases?: string[];
  surfaces: Record<HealthMetricSurface, boolean>;
}

const HEALTH_METRIC_REGISTRY: Record<string, HealthMetricDefinition> = {
  mood: {
    key: 'mood',
    label: 'mood',
    category: 'checkin',
    connectors: [],
    surfaces: { health: false, timeline: true, today: true, review: true },
  },
  energy: {
    key: 'energy',
    label: 'energy',
    category: 'checkin',
    connectors: [],
    surfaces: { health: false, timeline: true, today: true, review: true },
  },
  stress: {
    key: 'stress',
    label: 'stress',
    category: 'checkin',
    connectors: [],
    surfaces: { health: false, timeline: true, today: true, review: true },
  },
  focus: {
    key: 'focus',
    label: 'focus',
    category: 'checkin',
    connectors: [],
    surfaces: { health: false, timeline: true, today: true, review: true },
  },
  sleepHours: {
    key: 'sleepHours',
    label: 'sleepHours',
    category: 'checkin',
    unit: 'hours',
    connectors: [],
    surfaces: { health: false, timeline: true, today: true, review: true },
  },
  sleepQuality: {
    key: 'sleepQuality',
    label: 'sleepQuality',
    category: 'checkin',
    connectors: [],
    surfaces: { health: false, timeline: true, today: true, review: true },
  },
  symptom: {
    key: 'symptom',
    label: 'Symptom',
    category: 'manual',
    connectors: [],
    surfaces: { health: true, timeline: true, today: true, review: true },
  },
  'anxiety-episode': {
    key: 'anxiety-episode',
    label: 'Anxiety episode',
    category: 'manual',
    connectors: [],
    surfaces: { health: true, timeline: true, today: true, review: true },
  },
  'sleep-note': {
    key: 'sleep-note',
    label: 'Sleep note',
    category: 'manual',
    connectors: [],
    surfaces: { health: true, timeline: true, today: true, review: true },
  },
  'medication-dose': {
    key: 'medication-dose',
    label: 'Medication dose',
    category: 'manual',
    connectors: [],
    surfaces: { health: true, timeline: true, today: true, review: true },
  },
  'supplement-dose': {
    key: 'supplement-dose',
    label: 'Supplement dose',
    category: 'manual',
    connectors: [],
    surfaces: { health: true, timeline: true, today: true, review: true },
  },
  'sleep-duration': {
    key: 'sleep-duration',
    label: 'Sleep duration',
    category: 'recovery',
    unit: 'hours',
    connectors: ['healthkit-ios'],
    aliases: ['HKCategoryTypeIdentifierSleepAnalysis'],
    surfaces: { health: true, timeline: true, today: true, review: true },
  },
  'step-count': {
    key: 'step-count',
    label: 'Step count',
    category: 'fitness',
    unit: 'count',
    connectors: ['healthkit-ios'],
    aliases: ['HKQuantityTypeIdentifierStepCount'],
    surfaces: { health: false, timeline: true, today: false, review: true },
  },
  'resting-heart-rate': {
    key: 'resting-heart-rate',
    label: 'Resting heart rate',
    category: 'recovery',
    unit: 'bpm',
    connectors: ['healthkit-ios'],
    aliases: ['HKQuantityTypeIdentifierRestingHeartRate'],
    surfaces: { health: false, timeline: true, today: false, review: true },
  },
  'heart-rate-variability': {
    key: 'heart-rate-variability',
    label: 'Heart rate variability',
    category: 'recovery',
    unit: 'ms',
    connectors: [],
    surfaces: { health: false, timeline: true, today: false, review: true },
  },
  'active-energy': {
    key: 'active-energy',
    label: 'Active energy',
    category: 'fitness',
    unit: 'kcal',
    connectors: [],
    surfaces: { health: false, timeline: true, today: false, review: true },
  },
  workouts: {
    key: 'workouts',
    label: 'Workout',
    category: 'fitness',
    connectors: [],
    surfaces: { health: false, timeline: true, today: true, review: true },
  },
  distance: {
    key: 'distance',
    label: 'Distance',
    category: 'fitness',
    unit: 'km',
    connectors: [],
    surfaces: { health: false, timeline: true, today: false, review: true },
  },
  'vo2-max': {
    key: 'vo2-max',
    label: 'VO2 max',
    category: 'fitness',
    connectors: [],
    surfaces: { health: false, timeline: true, today: false, review: true },
  },
  weight: {
    key: 'weight',
    label: 'Weight',
    category: 'body',
    unit: 'kg',
    connectors: [],
    surfaces: { health: false, timeline: true, today: false, review: true },
  },
  'body-fat': {
    key: 'body-fat',
    label: 'Body fat',
    category: 'body',
    unit: '%',
    connectors: [],
    surfaces: { health: false, timeline: true, today: false, review: true },
  },
  'blood-pressure': {
    key: 'blood-pressure',
    label: 'Blood pressure',
    category: 'body',
    unit: 'mmHg',
    connectors: [],
    aliases: ['Systolic blood pressure'],
    surfaces: { health: false, timeline: true, today: false, review: true },
  },
  'blood-glucose': {
    key: 'blood-glucose',
    label: 'Blood glucose',
    category: 'body',
    connectors: [],
    surfaces: { health: false, timeline: true, today: false, review: true },
  },
  'oxygen-saturation': {
    key: 'oxygen-saturation',
    label: 'Oxygen saturation',
    category: 'recovery',
    unit: '%',
    connectors: [],
    aliases: ['oxygen-saturation'],
    surfaces: { health: false, timeline: true, today: false, review: true },
  },
  temperature: {
    key: 'temperature',
    label: 'Temperature',
    category: 'recovery',
    unit: 'celsius',
    connectors: [],
    surfaces: { health: false, timeline: true, today: false, review: true },
  },
};

const HEALTH_METRIC_LOOKUP = new Map<string, HealthMetricDefinition>();
for (const definition of Object.values(HEALTH_METRIC_REGISTRY)) {
  HEALTH_METRIC_LOOKUP.set(definition.key, definition);
  for (const alias of definition.aliases ?? []) {
    HEALTH_METRIC_LOOKUP.set(alias, definition);
  }
}

export type HealthMetricKey = keyof typeof HEALTH_METRIC_REGISTRY;

export const ALL_HEALTH_METRIC_KEYS = Object.keys(HEALTH_METRIC_REGISTRY) as HealthMetricKey[];

export function getHealthMetricDefinition(metricType: string): HealthMetricDefinition | undefined {
  return HEALTH_METRIC_LOOKUP.get(metricType);
}

export function formatHealthMetricLabel(metricType: string): string {
  return getHealthMetricDefinition(metricType)?.label ?? metricType;
}

export function formatHealthMetricValue(value: unknown, unit?: string): string {
  if (typeof value === 'number') {
    if (unit === 'hours') return `${value} hours`;
    if (unit === 'bpm') return `${value} bpm`;
    if (unit === 'count') return `${value} count`;
  }

  if (unit) return `${String(value ?? '')} ${unit}`.trim();
  return String(value ?? '');
}

export function isHealthMetricVisibleOnSurface(metricType: string, surface: HealthMetricSurface): boolean {
  return getHealthMetricDefinition(metricType)?.surfaces[surface] ?? false;
}

export function getCanonicalHealthMetricKey(metricType: string): string {
  return getHealthMetricDefinition(metricType)?.key ?? metricType;
}

export function matchesHealthMetric(metricType: string, expected: string): boolean {
  return getCanonicalHealthMetricKey(metricType) === expected;
}

export function countHealthMetricEvents(
  events: Array<{ eventType: string }>,
  expected: string
): number {
  return events.filter((event) => matchesHealthMetric(event.eventType, expected)).length;
}

export function hasHealthMetricEvent(
  events: Array<{ eventType: string }>,
  expected: string
): boolean {
  return events.some((event) => matchesHealthMetric(event.eventType, expected));
}

export function getConnectorSupportedMetricTypes(connector: NativeCompanionConnector): string[] {
  return ALL_HEALTH_METRIC_KEYS.filter((key) => HEALTH_METRIC_REGISTRY[key].connectors.includes(connector));
}

export function isConnectorMetricSupported(
  connector: NativeCompanionConnector,
  metricType: string
): boolean {
  return getHealthMetricDefinition(metricType)?.connectors.includes(connector) ?? false;
}
