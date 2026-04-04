import type { AssessmentResult } from '$lib/core/domain/types';

export interface AssessmentQuestion {
	id: string;
	prompt: string;
}

export interface AssessmentDefinition {
	instrument: AssessmentResult['instrument'];
	version: number;
	recallWindow: string;
	questions: AssessmentQuestion[];
	options: { value: number; label: string }[];
	scoreBand: (score: number) => string;
	isHighRisk?: (responses: number[]) => boolean;
}

const PHQ_GAD_OPTIONS = [
	{ value: 0, label: 'Not at all' },
	{ value: 1, label: 'Several days' },
	{ value: 2, label: 'More than half the days' },
	{ value: 3, label: 'Nearly every day' }
] as const;

const WHO5_OPTIONS = [
	{ value: 0, label: 'At no time' },
	{ value: 1, label: 'Some of the time' },
	{ value: 2, label: 'Less than half the time' },
	{ value: 3, label: 'More than half the time' },
	{ value: 4, label: 'Most of the time' },
	{ value: 5, label: 'All of the time' }
] as const;

const AUDIT_C_OPTIONS = [
	{ value: 0, label: 'Never / 1-2 drinks / Never six or more' },
	{ value: 1, label: 'Monthly or less / 3-4 drinks / Less than monthly' },
	{ value: 2, label: '2-4 times a month / 5-6 drinks / Monthly' },
	{ value: 3, label: '2-3 times a week / 7-9 drinks / Weekly' },
	{ value: 4, label: '4+ times a week / 10+ drinks / Daily or almost daily' }
] as const;

const AUDIT_OPTIONS = [
	{ value: 0, label: '0' },
	{ value: 1, label: '1' },
	{ value: 2, label: '2' },
	{ value: 3, label: '3' },
	{ value: 4, label: '4' }
] as const;

function createQuestionSet(prompts: string[]): AssessmentQuestion[] {
	return prompts.map((prompt, index) => ({
		id: `q${index + 1}`,
		prompt
	}));
}

function createThresholdBand(thresholds: Array<{ max: number; label: string }>, fallback: string) {
	return (score: number): string => {
		for (const threshold of thresholds) {
			if (score <= threshold.max) return threshold.label;
		}

		return fallback;
	};
}

export const ASSESSMENTS: Record<AssessmentResult['instrument'], AssessmentDefinition> = {
	'PHQ-9': {
		instrument: 'PHQ-9',
		version: 1,
		recallWindow: 'Over the last 2 weeks',
		questions: createQuestionSet([
			'Little interest or pleasure in doing things',
			'Feeling down, depressed, or hopeless',
			'Trouble falling or staying asleep, or sleeping too much',
			'Feeling tired or having little energy',
			'Poor appetite or overeating',
			'Feeling bad about yourself, or that you are a failure',
			'Trouble concentrating on things',
			'Moving or speaking slowly, or the opposite',
			'Thoughts that you would be better off dead, or of hurting yourself'
		]),
		options: [...PHQ_GAD_OPTIONS],
		scoreBand: createThresholdBand(
			[
				{ max: 4, label: 'Minimal' },
				{ max: 9, label: 'Mild' },
				{ max: 14, label: 'Moderate' },
				{ max: 19, label: 'Moderately severe' }
			],
			'Severe'
		),
		isHighRisk: (responses) => (responses[8] ?? 0) > 0
	},
	'GAD-7': {
		instrument: 'GAD-7',
		version: 1,
		recallWindow: 'Over the last 2 weeks',
		questions: createQuestionSet([
			'Feeling nervous, anxious, or on edge',
			'Not being able to stop or control worrying',
			'Worrying too much about different things',
			'Trouble relaxing',
			'Being so restless that it is hard to sit still',
			'Becoming easily annoyed or irritable',
			'Feeling afraid as if something awful might happen'
		]),
		options: [...PHQ_GAD_OPTIONS],
		scoreBand: createThresholdBand(
			[
				{ max: 4, label: 'Minimal' },
				{ max: 9, label: 'Mild' },
				{ max: 14, label: 'Moderate' }
			],
			'Severe'
		)
	},
	'WHO-5': {
		instrument: 'WHO-5',
		version: 1,
		recallWindow: 'Over the last 2 weeks',
		questions: createQuestionSet([
			'I have felt cheerful and in good spirits',
			'I have felt calm and relaxed',
			'I have felt active and vigorous',
			'I woke up feeling fresh and rested',
			'My daily life has been filled with things that interest me'
		]),
		options: [...WHO5_OPTIONS],
		scoreBand: createThresholdBand(
			[
				{ max: 12, label: 'Needs attention' },
				{ max: 19, label: 'Moderate wellbeing' }
			],
			'Strong wellbeing'
		)
	},
	'AUDIT-C': {
		instrument: 'AUDIT-C',
		version: 1,
		recallWindow: 'Typical alcohol use pattern',
		questions: createQuestionSet([
			'How often do you have a drink containing alcohol?',
			'How many standard drinks do you have on a typical day?',
			'How often do you have six or more drinks on one occasion?'
		]),
		options: [...AUDIT_C_OPTIONS],
		scoreBand: createThresholdBand(
			[
				{ max: 3, label: 'Lower risk' },
				{ max: 7, label: 'Elevated risk' }
			],
			'High risk'
		)
	},
	AUDIT: {
		instrument: 'AUDIT',
		version: 1,
		recallWindow: 'Alcohol use over the past year',
		questions: createQuestionSet(Array.from({ length: 10 }, (_, index) => `AUDIT item ${index + 1}`)),
		options: [...AUDIT_OPTIONS],
		scoreBand: createThresholdBand(
			[
				{ max: 7, label: 'Lower risk' },
				{ max: 15, label: 'Risky use' },
				{ max: 19, label: 'Harmful use' }
			],
			'Likely dependence'
		)
	}
};

export function getAssessmentDefinition(
	instrument: AssessmentResult['instrument']
): AssessmentDefinition {
	return ASSESSMENTS[instrument];
}

export function renderAssessment(
	instrument: AssessmentResult['instrument']
): AssessmentDefinition {
	return getAssessmentDefinition(instrument);
}

export function classifyAssessmentBand(
	instrument: AssessmentResult['instrument'],
	score: number
): string {
	return getAssessmentDefinition(instrument).scoreBand(score);
}

export function handleHighRiskAssessmentState(
	instrument: AssessmentResult['instrument'],
	responses: number[]
): { highRisk: boolean; message?: string } {
	if (instrument === 'PHQ-9' && getAssessmentDefinition('PHQ-9').isHighRisk?.(responses)) {
		return {
			highRisk: true,
			message:
				'This answer suggests you may need more support than this app can provide. If you feel at risk right now, contact local emergency services or a crisis line immediately.'
		};
	}

	return { highRisk: false };
}

export function scoreAssessment(
	instrument: AssessmentResult['instrument'],
	responses: number[]
): number {
	return responses.reduce((total, value) => total + value, 0);
}
