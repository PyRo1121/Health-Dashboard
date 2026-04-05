import type { AssessmentResult, DailyRecord, HealthEvent } from '$lib/core/domain/types';
import { buildHealthEventDisplay } from '$lib/core/shared/health-events';
import { MIN_SLEEP_HOURS } from './analytics-shared';

export function buildAssessmentSummary(assessments: AssessmentResult[]): string[] {
  return assessments
    .filter((assessment) => assessment.isComplete)
    .slice(0, 3)
    .map(
      (assessment) =>
        `${assessment.instrument}: ${assessment.band ?? 'In progress'} (${
          assessment.totalScore ?? 0
        })`
    );
}

export function buildDeviceHighlights(events: HealthEvent[]): string[] {
  return events
    .filter((event) => event.sourceType === 'native-companion')
    .sort((a, b) =>
      (b.sourceTimestamp ?? b.createdAt).localeCompare(a.sourceTimestamp ?? a.createdAt)
    )
    .slice(0, 3)
    .map((event) => {
      const display = buildHealthEventDisplay(event);
      return `${display.label}: ${display.valueLabel} on ${event.localDay}`;
    });
}

export function buildHealthHighlights(records: DailyRecord[], events: HealthEvent[]): string[] {
  const highlights: string[] = [];

  const lowSleepDays = new Set(
    records
      .filter(
        (record) => (record.sleepHours ?? 0) > 0 && (record.sleepHours ?? 0) < MIN_SLEEP_HOURS
      )
      .map((record) => record.date)
  );

  const anxietyEvents = events.filter((event) => event.eventType === 'anxiety-episode');
  const linkedAnxietyDay = anxietyEvents.find((event) => lowSleepDays.has(event.localDay));
  if (linkedAnxietyDay) {
    highlights.push(`Low sleep lined up with higher anxiety on ${linkedAnxietyDay.localDay}.`);
  }

  const strongSymptomEvent = events.find(
    (event) => event.eventType === 'symptom' && typeof event.value === 'number' && event.value >= 4
  );
  if (strongSymptomEvent) {
    highlights.push(`A high-severity symptom was logged on ${strongSymptomEvent.localDay}.`);
  }

  return highlights;
}
