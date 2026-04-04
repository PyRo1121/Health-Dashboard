import type { AssessmentResult } from '$lib/core/domain/types';
import type { AssessmentDefinition } from '$lib/features/assessments/service';

export const assessmentInstrumentOptions = [
	{ value: 'PHQ-9', label: 'PHQ-9' },
	{ value: 'GAD-7', label: 'GAD-7' },
	{ value: 'WHO-5', label: 'WHO-5' },
	{ value: 'AUDIT-C', label: 'AUDIT-C' }
] as const;

export function createAssessmentDraftResponses(
	latest: AssessmentResult | undefined,
	definition: AssessmentDefinition
): number[] {
	return latest?.itemResponses?.length
		? [...latest.itemResponses]
		: definition.questions.map(() => -1);
}

export function updateAssessmentResponse(
	draftResponses: number[],
	index: number,
	value: string
): number[] {
	const next = [...draftResponses];
	next[index] = Number(value);
	return next;
}

export function createAssessmentResultRows(latest: AssessmentResult | undefined): string[] {
	return latest?.isComplete
		? [
				`Score: ${latest.totalScore}`,
				`Band: ${latest.band}`,
				`Stored for ${latest.localDay}. Safety state: ${latest.highRisk ? 'flagged' : 'clear'}.`
			]
		: [];
}
