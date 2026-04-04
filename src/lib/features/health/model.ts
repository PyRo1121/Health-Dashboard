import type { HealthEvent, HealthTemplate, HealthTemplateType } from '$lib/core/domain/types';
import { humanizeSourceType, sortHealthEventTimestamp } from '$lib/core/shared/health-events';
import type { HealthSnapshot } from './service';

export const DEFAULT_SYMPTOM_FORM = {
	symptom: '',
	severity: '3',
	note: ''
} as const;

export const DEFAULT_ANXIETY_FORM = {
	intensity: '3',
	trigger: '',
	durationMinutes: '',
	note: ''
} as const;

export const DEFAULT_SLEEP_NOTE_FORM = {
	note: '',
	restfulness: '',
	context: ''
} as const;

export const DEFAULT_TEMPLATE_FORM = {
	label: '',
	templateType: 'supplement',
	defaultDose: '',
	defaultUnit: '',
	note: ''
} as const;

export type SymptomFormState = { [Key in keyof typeof DEFAULT_SYMPTOM_FORM]: string };
export type AnxietyFormState = { [Key in keyof typeof DEFAULT_ANXIETY_FORM]: string };
export type SleepNoteFormState = { [Key in keyof typeof DEFAULT_SLEEP_NOTE_FORM]: string };
export type TemplateFormState = {
	label: string;
	templateType: HealthTemplateType;
	defaultDose: string;
	defaultUnit: string;
	note: string;
};

export interface HealthEventRow {
	id: string;
	title: string;
	badge?: string;
	lines: string[];
	meta: string;
}

export function createSymptomForm(): SymptomFormState {
	return { ...DEFAULT_SYMPTOM_FORM };
}

export function createAnxietyForm(): AnxietyFormState {
	return { ...DEFAULT_ANXIETY_FORM };
}

export function createSleepNoteForm(): SleepNoteFormState {
	return { ...DEFAULT_SLEEP_NOTE_FORM };
}

export function createTemplateForm(): TemplateFormState {
	return { ...DEFAULT_TEMPLATE_FORM };
}

function formatDose(amount?: number, unit?: string): string | null {
	if (amount === undefined && !unit) return null;
	if (amount === undefined) return unit ?? null;
	return [String(amount), unit].filter(Boolean).join(' ');
}

function compactLines(lines: Array<string | undefined>): string[] {
	return lines.filter((line): line is string => Boolean(line));
}

function asOptionalString(value: string | null): string | undefined {
	return value ?? undefined;
}

function formatEventValue(value: HealthEvent['value'], unit?: string): string | undefined {
	if (typeof value !== 'number' && typeof value !== 'string') {
		return undefined;
	}

	return [String(value), unit].filter(Boolean).join(' ');
}

function formatEventTime(event: HealthEvent): string {
	const timestamp = sortHealthEventTimestamp(event);
	return new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit'
	}).format(new Date(timestamp));
}

function createEventMeta(event: HealthEvent): string {
	return `${humanizeSourceType(event.sourceType)} · ${formatEventTime(event)}`;
}

function buildSleepDurationRow(event: HealthEvent): HealthEventRow {
	const valueLabel = formatEventValue(event.value, event.unit) ?? 'Imported sleep';

	return {
		id: event.id,
		title: 'Imported sleep',
		badge: valueLabel,
		lines: compactLines([event.sourceApp]),
		meta: createEventMeta(event)
	};
}

function buildManualHealthRow(event: HealthEvent): HealthEventRow {
	const payload = event.payload ?? {};
	const meta = createEventMeta(event);

	if (event.eventType === 'symptom') {
		const symptom = typeof payload.symptom === 'string' ? payload.symptom : 'Symptom';
		const severity = typeof payload.severity === 'number' ? `Severity ${payload.severity}/5` : undefined;
		return {
			id: event.id,
			title: symptom,
			badge: severity,
			lines: compactLines([typeof payload.note === 'string' ? payload.note : undefined]),
			meta
		};
	}

	if (event.eventType === 'anxiety-episode') {
		const lines = [
			typeof payload.trigger === 'string' ? `Trigger: ${payload.trigger}` : undefined,
			typeof payload.durationMinutes === 'number'
				? `Duration: ${payload.durationMinutes} min`
				: undefined,
			typeof payload.note === 'string' ? payload.note : undefined
		];
		const intensity = typeof payload.intensity === 'number' ? `Intensity ${payload.intensity}/5` : undefined;
		return {
			id: event.id,
			title: 'Anxiety episode',
			badge: intensity,
			lines: compactLines(lines),
			meta
		};
	}

	if (event.eventType === 'sleep-note') {
		const lines = [
			typeof payload.note === 'string' ? payload.note : undefined,
			typeof payload.context === 'string' ? `Context: ${payload.context}` : undefined
		];
		const restfulness = typeof payload.restfulness === 'number'
			? `Restfulness ${payload.restfulness}/5`
			: undefined;
		return {
			id: event.id,
			title: 'Sleep note',
			badge: restfulness,
			lines: compactLines(lines),
			meta
		};
	}

	if (event.eventType === 'medication-dose' || event.eventType === 'supplement-dose') {
		const title = typeof payload.templateName === 'string'
			? payload.templateName
			: event.eventType === 'medication-dose'
				? 'Medication log'
				: 'Supplement log';
		const dose = formatDose(
			typeof payload.amount === 'number' ? payload.amount : undefined,
			typeof payload.unit === 'string' ? payload.unit : undefined
		);
		return {
			id: event.id,
			title,
			badge: event.eventType === 'medication-dose' ? 'Medication' : 'Supplement',
			lines: compactLines([asOptionalString(dose), typeof payload.note === 'string' ? payload.note : undefined]),
			meta
		};
	}

	return {
		id: event.id,
		title: event.eventType,
		badge: typeof event.value === 'number' ? String(event.value) : undefined,
		lines: [],
		meta
	};
}

export function createHealthEventRows(events: HealthEvent[]): HealthEventRow[] {
	return events.map((event) =>
		event.eventType === 'sleep-duration' ? buildSleepDurationRow(event) : buildManualHealthRow(event)
	);
}

export function createSleepCardLines(snapshot: HealthSnapshot | null): string[] {
	if (!snapshot?.sleepEvent) {
		return [];
	}

	const event = snapshot.sleepEvent;
	const lines = [
		formatEventValue(event.value, event.unit),
		event.sourceApp ? `Source: ${event.sourceApp}` : undefined
	];

	return compactLines(lines);
}

export function describeHealthTemplate(template: HealthTemplate): string[] {
	return compactLines([
		asOptionalString(formatDose(template.defaultDose, template.defaultUnit)),
		template.note,
		template.templateType === 'medication' ? 'Medication template' : 'Supplement template'
	]);
}
