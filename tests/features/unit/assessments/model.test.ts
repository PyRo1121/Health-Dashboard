import { describe, expect, it } from 'vitest';
import type { AssessmentResult } from '$lib/core/domain/types';
import { renderAssessment } from '$lib/features/assessments/service';
import {
  createAssessmentDraftResponses,
  createAssessmentResultRows,
  updateAssessmentResponse,
} from '$lib/features/assessments/model';

describe('assessments model', () => {
  it('builds draft responses and result rows', () => {
    const definition = renderAssessment('PHQ-9');
    const latest: AssessmentResult = {
      id: 'assessment:PHQ-9:2026-04-02',
      createdAt: '2026-04-02T08:00:00.000Z',
      updatedAt: '2026-04-02T08:00:00.000Z',
      localDay: '2026-04-02',
      instrument: 'PHQ-9',
      version: 1,
      recallWindow: definition.recallWindow,
      itemResponses: [1, 1, 1],
      isComplete: true,
      highRisk: false,
      totalScore: 9,
      band: 'Mild',
    };

    expect(createAssessmentDraftResponses(undefined, definition)).toHaveLength(9);
    expect(updateAssessmentResponse([0, 0, 0], 1, '2')).toEqual([0, 2, 0]);
    expect(createAssessmentResultRows(latest)).toContain('Score: 9');
  });
});
