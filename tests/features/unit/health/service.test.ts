import { describe, expect, it } from 'vitest';
import {
  buildHealthSnapshot,
  logAnxietyEvent,
  logSleepNoteEvent,
  logSymptomEvent,
  quickLogHealthTemplate,
  saveHealthTemplate,
} from '$lib/features/health/service';
import { useTestHealthDb } from '../../../support/unit/testDb';

describe('health service', () => {
  const getDb = useTestHealthDb();

  it('creates reusable templates and quick-logs them as canonical health events', async () => {
    const db = getDb();
    const template = await saveHealthTemplate(db, {
      label: 'Magnesium glycinate',
      templateType: 'supplement',
      defaultDose: 2,
      defaultUnit: 'capsules',
      note: 'Night stack',
    });

    const event = await quickLogHealthTemplate(db, {
      localDay: '2026-04-02',
      templateId: template.id,
    });

    expect(template.label).toBe('Magnesium glycinate');
    expect(event.eventType).toBe('supplement-dose');
    expect(event.payload).toMatchObject({
      templateId: template.id,
      templateName: 'Magnesium glycinate',
      templateType: 'supplement',
      amount: 2,
      unit: 'capsules',
    });
  });

  it('persists a medication template reference link when saving a normalized medication template', async () => {
    const db = getDb();
    const template = await saveHealthTemplate(db, {
      label: 'Metformin 500 MG Oral Tablet',
      templateType: 'medication',
      defaultDose: 1,
      defaultUnit: 'tablet',
      note: 'With breakfast',
      referenceUrl:
        'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
    });

    expect(template).toMatchObject({
      label: 'Metformin 500 MG Oral Tablet',
      templateType: 'medication',
      referenceUrl:
        'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
    });
  });

  it('carries a saved medication template reference link into the quick-logged event payload', async () => {
    const db = getDb();
    const template = await saveHealthTemplate(db, {
      label: 'Metformin 500 MG Oral Tablet',
      templateType: 'medication',
      defaultDose: 1,
      defaultUnit: 'tablet',
      note: 'With breakfast',
      referenceUrl:
        'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
    });

    const event = await quickLogHealthTemplate(db, {
      localDay: '2026-04-02',
      templateId: template.id,
    });

    expect(event.payload).toMatchObject({
      templateId: template.id,
      templateName: 'Metformin 500 MG Oral Tablet',
      referenceUrl:
        'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
    });
  });

  it('builds a daily health snapshot with imported sleep and manual health events only', async () => {
    const db = getDb();
    await db.healthEvents.bulkAdd([
      {
        id: 'sleep-import',
        createdAt: '2026-04-02T12:30:00Z',
        updatedAt: '2026-04-02T12:30:00Z',
        sourceType: 'native-companion',
        sourceApp: 'HealthKit Companion',
        sourceTimestamp: '2026-04-02T12:30:00Z',
        localDay: '2026-04-02',
        confidence: 1,
        eventType: 'sleep-duration',
        value: 8,
        unit: 'hours',
      },
      {
        id: 'step-import',
        createdAt: '2026-04-02T14:00:00Z',
        updatedAt: '2026-04-02T14:00:00Z',
        sourceType: 'native-companion',
        sourceApp: 'HealthKit Companion',
        sourceTimestamp: '2026-04-02T14:00:00Z',
        localDay: '2026-04-02',
        confidence: 1,
        eventType: 'step-count',
        value: 8400,
        unit: 'count',
      },
    ]);
    await logSymptomEvent(db, {
      localDay: '2026-04-02',
      symptom: 'Headache',
      severity: 4,
      note: 'After lunch',
    });
    await logAnxietyEvent(db, {
      localDay: '2026-04-02',
      intensity: 3,
      trigger: 'Crowded store',
      durationMinutes: 20,
    });
    await logSleepNoteEvent(db, {
      localDay: '2026-04-02',
      note: 'Woke up twice',
      restfulness: 2,
      context: 'Late caffeine',
    });

    const snapshot = await buildHealthSnapshot(db, '2026-04-02');

    expect(snapshot.sleepEvent?.id).toBe('sleep-import');
    expect(snapshot.events.map((event) => event.eventType).sort()).toEqual([
      'anxiety-episode',
      'sleep-duration',
      'sleep-note',
      'symptom',
    ]);
  });

  it('persists a symptom reference link when logging a suggested symptom', async () => {
    const db = getDb();

    const event = await logSymptomEvent(db, {
      localDay: '2026-04-02',
      symptom: 'Headache',
      severity: 4,
      note: 'After lunch',
      referenceUrl:
        'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
    });

    expect(event.payload).toMatchObject({
      symptom: 'Headache',
      referenceUrl:
        'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
    });
  });

  it('drops unsafe reference urls when saving templates and symptom events', async () => {
    const db = getDb();
    const template = await saveHealthTemplate(db, {
      label: 'Unsafe template',
      templateType: 'medication',
      referenceUrl: 'javascript:alert(1)',
    });

    const event = await logSymptomEvent(db, {
      localDay: '2026-04-02',
      symptom: 'Unsafe symptom',
      severity: 3,
      referenceUrl: 'javascript:alert(1)',
    });

    expect(template.referenceUrl).toBeUndefined();
    expect(event.payload).toMatchObject({
      symptom: 'Unsafe symptom',
      referenceUrl: undefined,
    });
  });
});
