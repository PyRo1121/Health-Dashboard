import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import {
  loadReviewPage,
  saveReviewExperimentPage,
  setReviewExperiment,
} from '$lib/features/review/controller';
import { createFoodEntry } from '$lib/features/nutrition/store';
import { saveDailyCheckin } from '$lib/features/today/actions';
import { setSobrietyStatusForDay } from '$lib/features/sobriety/service';
import { submitAssessment } from '$lib/features/assessments/service';

describe('review controller', () => {
  const getDb = useTestHealthDb();

  it('loads and saves review controller state', async () => {
    const db = getDb();
    await saveDailyCheckin(db, {
      date: '2026-04-02',
      mood: 5,
      energy: 4,
      stress: 2,
      focus: 4,
      sleepHours: 8,
      sleepQuality: 4,
    });
    await createFoodEntry(db, {
      localDay: '2026-04-02',
      mealType: 'breakfast',
      name: 'Higher protein breakfast',
      calories: 420,
      protein: 95,
      fiber: 9,
    });
    await setSobrietyStatusForDay(db, { localDay: '2026-04-02', status: 'sober' });
    await submitAssessment(db, {
      localDay: '2026-04-02',
      instrument: 'WHO-5',
      itemResponses: [3, 3, 3, 4, 4],
    });

    let state = await loadReviewPage(db, '2026-04-02');
    expect(state.weekly?.snapshot.headline).toBeTruthy();
    state = setReviewExperiment(state, 'Increase hydration tracking');
    state = await saveReviewExperimentPage(db, state);
    expect(state.weekly?.snapshot.experiment).toBe('Increase hydration tracking');
    expect(state.saveNotice).toBe('Experiment saved.');
  });

  it('falls back to the latest review-relevant week when the current week is empty', async () => {
    const db = getDb();
    await saveDailyCheckin(db, {
      date: '2026-04-02',
      mood: 5,
      energy: 4,
      stress: 2,
      focus: 4,
      sleepHours: 8,
      sleepQuality: 4,
    });

    const state = await loadReviewPage(db, '2026-04-10');

    expect(state.localDay).toBe('2026-04-02');
    expect(state.weekly?.snapshot.daysTracked).toBe(1);
  });
});
