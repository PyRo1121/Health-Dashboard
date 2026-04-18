import { describe, expect, it } from 'vitest';
import { createHealthPageState, loadHealthPage } from '$lib/features/health/state';
import {
  quickLogTemplatePage,
  saveAnxietyPage,
  saveSleepNotePage,
  saveSymptomPage,
  saveTemplatePage,
} from '$lib/features/health/actions';
import { useTestHealthDb } from '../../../support/unit/testDb';

describe('health page state and actions', () => {
  const getDb = useTestHealthDb();

  it('loads state and runs the core health page actions', async () => {
    const db = getDb();
    let state = await loadHealthPage(db, '2026-04-02');
    expect(state.loading).toBe(false);
    expect(state.localDay).toBe('2026-04-02');

    state = await saveSymptomPage(db, {
      ...state,
      symptomForm: {
        symptom: 'Nausea',
        severity: '2',
        note: 'Faded after breakfast',
        referenceUrl: '',
      },
    });
    expect(state.saveNotice).toBe('Symptom logged.');
    expect(state.snapshot?.events.some((event) => event.eventType === 'symptom')).toBe(true);
    expect(await db.reviewSnapshots.count()).toBe(1);

    state = await saveAnxietyPage(db, {
      ...state,
      anxietyForm: {
        intensity: '4',
        trigger: 'Busy inbox',
        durationMinutes: '15',
        note: 'Walked it off',
      },
    });
    expect(state.saveNotice).toBe('Anxiety episode logged.');
    expect(await db.reviewSnapshots.count()).toBe(1);

    state = await saveSleepNotePage(db, {
      ...state,
      sleepNoteForm: {
        note: 'Fell asleep late',
        restfulness: '2',
        context: 'Screen time',
      },
    });
    expect(state.saveNotice).toBe('Sleep context logged.');
    expect(await db.reviewSnapshots.count()).toBe(1);

    state = await saveTemplatePage(db, {
      ...state,
      templateForm: {
        label: 'Vitamin D3',
        templateType: 'supplement',
        defaultDose: '1',
        defaultUnit: 'softgel',
        note: 'Morning stack',
        referenceUrl: '',
      },
    });
    expect(state.saveNotice).toBe('Template saved.');
    expect(state.snapshot?.templates).toHaveLength(1);
    expect(await db.reviewSnapshots.count()).toBe(1);

    state = await quickLogTemplatePage(db, state, state.snapshot?.templates[0]?.id ?? '');
    expect(state.saveNotice).toBe('Template logged.');
    expect(state.snapshot?.events.some((event) => event.eventType === 'supplement-dose')).toBe(
      true
    );
    expect(await db.reviewSnapshots.count()).toBe(1);
  });

  it('carries a selected symptom reference link through the save action into the logged event', async () => {
    const db = getDb();
    const state = await loadHealthPage(db, '2026-04-02');

    await saveSymptomPage(db, {
      ...state,
      symptomForm: {
        symptom: 'Headache',
        severity: '4',
        note: 'After lunch',
        referenceUrl:
          'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
      },
    });

    const events = await db.healthEvents.toArray();
    expect(events.find((event) => event.eventType === 'symptom')?.payload).toMatchObject({
      symptom: 'Headache',
      referenceUrl:
        'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
    });
  });

  it('guards required symptom and sleep-note fields', async () => {
    const db = getDb();
    const state = await loadHealthPage(db, '2026-04-02');

    expect(await saveSymptomPage(db, createHealthPageState())).toMatchObject({
      saveNotice: 'Symptom name is required.',
    });
    expect(
      await saveSleepNotePage(db, {
        ...state,
        sleepNoteForm: {
          note: '',
          restfulness: '',
          context: '',
        },
      })
    ).toMatchObject({
      saveNotice: 'Sleep note is required.',
    });
  });
});
