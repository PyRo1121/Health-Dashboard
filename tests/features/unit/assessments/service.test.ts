import { describe, expect, it } from 'vitest';
import {
  classifyAssessmentBand,
  getLatestAssessment,
  handleHighRiskAssessmentState,
  renderAssessment,
  saveAssessmentProgress,
  scoreAssessment,
  submitAssessment,
} from '$lib/features/assessments/service';
import { useTestHealthDb } from '../../../support/unit/testDb';

describe('assessment service', () => {
  const getDb = useTestHealthDb();

  it('scores and bands PHQ-9 deterministically', () => {
    const responses = [1, 1, 1, 1, 1, 1, 1, 1, 0];
    expect(scoreAssessment('PHQ-9', responses)).toBe(8);
    expect(classifyAssessmentBand('PHQ-9', 8)).toBe('Mild');
  });

  it('detects the PHQ-9 safety branch from item 9', () => {
    const risk = handleHighRiskAssessmentState('PHQ-9', [0, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(risk.highRisk).toBe(true);
    expect(risk.message).toMatch(/need more support/i);
  });

  it('saves partial progress and resumes it', async () => {
    const db = getDb();
    await saveAssessmentProgress(db, {
      localDay: '2026-04-02',
      instrument: 'GAD-7',
      itemResponses: [1, 2, 1],
    });

    const latest = await getLatestAssessment(db, '2026-04-02', 'GAD-7');
    expect(latest?.isComplete).toBe(false);
    expect(latest?.itemResponses).toEqual([1, 2, 1]);
  });

  it('rejects incomplete submissions', async () => {
    const db = getDb();
    await expect(
      submitAssessment(db, {
        localDay: '2026-04-02',
        instrument: 'PHQ-9',
        itemResponses: [0, 1, 0],
      })
    ).rejects.toThrow(/Incomplete assessment/);
  });

  it('submits complete results with score, band, and risk metadata', async () => {
    const db = getDb();
    const result = await submitAssessment(db, {
      localDay: '2026-04-02',
      instrument: 'PHQ-9',
      itemResponses: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    });

    expect(result.isComplete).toBe(true);
    expect(result.totalScore).toBe(9);
    expect(result.band).toBe('Mild');
    expect(result.highRisk).toBe(true);
  });

  it('renders the expected question count per instrument', () => {
    expect(renderAssessment('PHQ-9').questions).toHaveLength(9);
    expect(renderAssessment('GAD-7').questions).toHaveLength(7);
    expect(renderAssessment('WHO-5').questions).toHaveLength(5);
    expect(renderAssessment('AUDIT-C').questions).toHaveLength(3);
  });
});
