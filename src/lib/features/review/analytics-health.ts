import type {
  AssessmentResult,
  DailyRecord,
  HealthEvent,
  JournalEntry,
} from '$lib/core/domain/types';
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

function formatJournalEntryLabel(entry: JournalEntry): string {
  const labels: Record<JournalEntry['entryType'], string> = {
    freeform: 'Journal entry',
    morning_intention: 'Morning intention',
    evening_review: 'Evening review',
    craving_reflection: 'Craving reflection',
    lapse_reflection: 'Lapse reflection',
    symptom_note: 'Symptom note',
    experiment_note: 'Experiment note',
    provider_visit_note: 'Provider visit note',
  };

  return labels[entry.entryType];
}

function excerpt(text: string, max = 90): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) {
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  }

  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function buildJournalHighlights(entries: JournalEntry[]): string[] {
  return [...entries]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 3)
    .map(
      (entry) => `${formatJournalEntryLabel(entry)} on ${entry.localDay}: ${excerpt(entry.body)}`
    );
}

export function buildContextSignals(
  records: DailyRecord[],
  events: HealthEvent[],
  entries: JournalEntry[]
): string[] {
  const signals: string[] = [];
  const lowSleepDays = new Set(
    records
      .filter(
        (record) => (record.sleepHours ?? 0) > 0 && (record.sleepHours ?? 0) < MIN_SLEEP_HOURS
      )
      .map((record) => record.date)
  );
  const journalDays = new Set(entries.map((entry) => entry.localDay));

  const lowSleepJournalDay = [...lowSleepDays].find((day) => journalDays.has(day));
  if (lowSleepJournalDay) {
    signals.push(`Low sleep and a written reflection both landed on ${lowSleepJournalDay}.`);
  }

  const symptomJournalDay = events.find(
    (event) => event.eventType === 'symptom' && journalDays.has(event.localDay)
  )?.localDay;
  if (symptomJournalDay) {
    signals.push(`Symptoms and written context both surfaced on ${symptomJournalDay}.`);
  }

  const anxietyJournalDay = events.find(
    (event) => event.eventType === 'anxiety-episode' && journalDays.has(event.localDay)
  )?.localDay;
  if (anxietyJournalDay) {
    signals.push(`Anxiety and written context both surfaced on ${anxietyJournalDay}.`);
  }

  return [...new Set(signals)];
}

export function buildPatternHighlights(
  entries: JournalEntry[],
  events: HealthEvent[]
): string[] {
  const highlights: string[] = [];
  const eventsById = new Map(events.map((event) => [event.id, event]));

  const symptomDaysByName = new Map<string, Set<string>>();
  const anxietyDays = new Set<string>();

  for (const entry of entries) {
    const seenSymptomNames = new Set<string>();
    let linkedAnxiety = false;

    for (const eventId of entry.linkedEventIds) {
      const event = eventsById.get(eventId);
      if (!event) {
        continue;
      }

      if (event.eventType === 'symptom') {
        const symptomName =
          typeof event.payload?.symptom === 'string'
            ? event.payload.symptom.trim()
            : 'Symptom';
        if (!seenSymptomNames.has(symptomName)) {
          seenSymptomNames.add(symptomName);
          if (!symptomDaysByName.has(symptomName)) {
            symptomDaysByName.set(symptomName, new Set());
          }
          symptomDaysByName.get(symptomName)!.add(entry.localDay);
        }
      }

      if (event.eventType === 'anxiety-episode') {
        linkedAnxiety = true;
      }
    }

    if (linkedAnxiety) {
      anxietyDays.add(entry.localDay);
    }
  }

  for (const [symptomName, days] of symptomDaysByName) {
    if (days.size >= 2) {
      highlights.push(`${symptomName} kept showing up in your notes on ${days.size} days this week.`);
    }
  }

  if (anxietyDays.size >= 2) {
    highlights.push(`Anxiety-related context showed up in your notes on ${anxietyDays.size} days this week.`);
  }

  return highlights;
}
