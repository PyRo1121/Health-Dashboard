import { describe, expect, it } from 'vitest';
import type { HealthEvent, HealthTemplate } from '$lib/core/domain/types';
import {
  createHealthEventRows,
  createSleepCardLines,
  describeHealthTemplate,
  updateSymptomFormValue,
  updateTemplateFormValue,
} from '$lib/features/health/model';

describe('health model', () => {
  it('formats sleep and manual health event rows for the page', () => {
    const events: HealthEvent[] = [
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
        id: 'symptom-1',
        createdAt: '2026-04-02T15:00:00Z',
        updatedAt: '2026-04-02T15:00:00Z',
        sourceType: 'manual',
        sourceApp: 'personal-health-cockpit',
        sourceTimestamp: '2026-04-02T15:00:00Z',
        localDay: '2026-04-02',
        confidence: 1,
        eventType: 'symptom',
        value: 4,
        payload: {
          kind: 'symptom',
          symptom: 'Headache',
          severity: 4,
          note: 'After lunch',
          referenceUrl:
            'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
        },
      },
    ];

    const rows = createHealthEventRows(events);
    expect(rows[0]).toMatchObject({
      title: 'Imported sleep',
      badge: '8 hours',
    });
    expect(rows[1]).toMatchObject({
      title: 'Headache',
      badge: 'Severity 4/5',
      lines: ['After lunch'],
      referenceUrl:
        'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
    });
    expect(
      createSleepCardLines({ localDay: '2026-04-02', events, templates: [], sleepEvent: events[0] })
    ).toEqual(['8 hours', 'Source: HealthKit Companion']);
  });

  it('describes health templates for quick-log cards', () => {
    const template: HealthTemplate = {
      id: 'template-1',
      createdAt: '2026-04-02T08:00:00Z',
      updatedAt: '2026-04-02T08:00:00Z',
      label: 'Vitamin D3',
      templateType: 'supplement',
      defaultDose: 1,
      defaultUnit: 'softgel',
      note: 'Morning stack',
    };

    expect(describeHealthTemplate(template)).toEqual([
      '1 softgel',
      'Morning stack',
      'Supplement template',
    ]);
  });

  it('formats anxiety and template rows without blank detail lines', () => {
    const events: HealthEvent[] = [
      {
        id: 'anxiety-1',
        createdAt: '2026-04-02T10:00:00Z',
        updatedAt: '2026-04-02T10:00:00Z',
        sourceType: 'manual',
        sourceApp: 'personal-health-cockpit',
        sourceTimestamp: '2026-04-02T10:00:00Z',
        localDay: '2026-04-02',
        confidence: 1,
        eventType: 'anxiety-episode',
        value: 3,
        payload: {
          kind: 'anxiety',
          intensity: 3,
          trigger: 'Crowded store',
        },
      },
      {
        id: 'supplement-1',
        createdAt: '2026-04-02T12:00:00Z',
        updatedAt: '2026-04-02T12:00:00Z',
        sourceType: 'manual',
        sourceApp: 'personal-health-cockpit',
        sourceTimestamp: '2026-04-02T12:00:00Z',
        localDay: '2026-04-02',
        confidence: 1,
        eventType: 'supplement-dose',
        value: 2,
        unit: 'capsules',
        payload: {
          kind: 'template-dose',
          templateId: 'template-1',
          templateName: 'Magnesium glycinate',
          templateType: 'supplement',
          amount: 2,
          unit: 'capsules',
        },
      },
    ];

    const rows = createHealthEventRows(events);

    expect(rows[0]).toMatchObject({
      title: 'Anxiety episode',
      badge: 'Intensity 3/5',
      lines: ['Trigger: Crowded store'],
    });
    expect(rows[1]).toMatchObject({
      title: 'Magnesium glycinate',
      badge: 'Supplement',
      lines: ['2 capsules'],
    });
  });

  it('surfaces a reference link on medication event rows when one exists', () => {
    const events: HealthEvent[] = [
      {
        id: 'medication-1',
        createdAt: '2026-04-02T12:00:00Z',
        updatedAt: '2026-04-02T12:00:00Z',
        sourceType: 'manual',
        sourceApp: 'personal-health-cockpit',
        sourceTimestamp: '2026-04-02T12:00:00Z',
        localDay: '2026-04-02',
        confidence: 1,
        eventType: 'medication-dose',
        value: 1,
        unit: 'tablet',
        payload: {
          kind: 'template-dose',
          templateId: 'template-1',
          templateName: 'Metformin 500 MG Oral Tablet',
          templateType: 'medication',
          amount: 1,
          unit: 'tablet',
          referenceUrl:
            'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
        },
      },
    ];

    const rows = createHealthEventRows(events);
    expect(rows[0]).toMatchObject({
      title: 'Metformin 500 MG Oral Tablet',
      badge: 'Medication',
      lines: ['1 tablet'],
      referenceUrl:
        'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
    });
  });

  it('clears suggestion reference urls when the identifying symptom or template fields change', () => {
    expect(
      updateSymptomFormValue(
        {
          symptom: 'Headache',
          severity: '4',
          note: 'After lunch',
          referenceUrl:
            'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
        },
        'symptom',
        'Migraine'
      )
    ).toMatchObject({
      symptom: 'Migraine',
      referenceUrl: '',
    });

    expect(
      updateSymptomFormValue(
        {
          symptom: 'Headache',
          severity: '4',
          note: 'After lunch',
          referenceUrl:
            'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
        },
        'note',
        'Worse after dinner'
      )
    ).toMatchObject({
      note: 'Worse after dinner',
      referenceUrl:
        'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
    });

    expect(
      updateTemplateFormValue(
        {
          label: 'Metformin 500 MG Oral Tablet',
          templateType: 'medication',
          defaultDose: '1',
          defaultUnit: 'tablet',
          note: 'With breakfast',
          referenceUrl:
            'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
        },
        'label',
        'Ibuprofen'
      )
    ).toMatchObject({
      label: 'Ibuprofen',
      referenceUrl: '',
    });

    expect(
      updateTemplateFormValue(
        {
          label: 'Metformin 500 MG Oral Tablet',
          templateType: 'medication',
          defaultDose: '1',
          defaultUnit: 'tablet',
          note: 'With breakfast',
          referenceUrl:
            'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
        },
        'templateType',
        'supplement'
      )
    ).toMatchObject({
      templateType: 'supplement',
      referenceUrl: '',
    });
  });
});
