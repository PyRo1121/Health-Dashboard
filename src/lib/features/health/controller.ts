import type { HealthDatabase } from '$lib/core/db/types';
import type { HealthSnapshot } from './service';
import {
	buildHealthSnapshot,
	logAnxietyEvent,
	logSleepNoteEvent,
	logSymptomEvent,
	quickLogHealthTemplate,
	saveHealthTemplate
} from './service';
import {
	createAnxietyForm,
	createSleepNoteForm,
	createSymptomForm,
	createTemplateForm,
	type AnxietyFormState,
	type SleepNoteFormState,
	type SymptomFormState,
	type TemplateFormState
} from './model';

export interface HealthPageState {
	loading: boolean;
	localDay: string;
	snapshot: HealthSnapshot | null;
	saveNotice: string;
	symptomForm: SymptomFormState;
	anxietyForm: AnxietyFormState;
	sleepNoteForm: SleepNoteFormState;
	templateForm: TemplateFormState;
}

export function createHealthPageState(): HealthPageState {
	return {
		loading: true,
		localDay: '',
		snapshot: null,
		saveNotice: '',
		symptomForm: createSymptomForm(),
		anxietyForm: createAnxietyForm(),
		sleepNoteForm: createSleepNoteForm(),
		templateForm: createTemplateForm()
	};
}

async function reloadHealthPage(
	db: HealthDatabase,
	state: HealthPageState,
	overrides: Partial<HealthPageState> = {}
): Promise<HealthPageState> {
	const snapshot = await buildHealthSnapshot(db, state.localDay);
	return {
		...state,
		loading: false,
		snapshot,
		...overrides
	};
}

function parseOptionalNumber(value: string | number | undefined): number | undefined {
	if (value === undefined) return undefined;
	const normalized = typeof value === 'number' ? String(value) : value;
	if (!normalized.trim()) return undefined;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export async function loadHealthPage(db: HealthDatabase, localDay: string): Promise<HealthPageState> {
	return await reloadHealthPage(db, {
		...createHealthPageState(),
		localDay
	});
}

export async function saveSymptomPage(
	db: HealthDatabase,
	state: HealthPageState
): Promise<HealthPageState> {
	if (!state.symptomForm.symptom.trim()) {
		return {
			...state,
			saveNotice: 'Symptom name is required.'
		};
	}

	await logSymptomEvent(db, {
		localDay: state.localDay,
		symptom: state.symptomForm.symptom,
		severity: Number(state.symptomForm.severity),
		note: state.symptomForm.note
	});

	return reloadHealthPage(db, state, {
		saveNotice: 'Symptom logged.',
		symptomForm: createSymptomForm()
	});
}

export async function saveAnxietyPage(
	db: HealthDatabase,
	state: HealthPageState
): Promise<HealthPageState> {
	await logAnxietyEvent(db, {
		localDay: state.localDay,
		intensity: Number(state.anxietyForm.intensity),
		trigger: state.anxietyForm.trigger,
		durationMinutes: parseOptionalNumber(state.anxietyForm.durationMinutes),
		note: state.anxietyForm.note
	});

	return reloadHealthPage(db, state, {
		saveNotice: 'Anxiety episode logged.',
		anxietyForm: createAnxietyForm()
	});
}

export async function saveSleepNotePage(
	db: HealthDatabase,
	state: HealthPageState
): Promise<HealthPageState> {
	if (!state.sleepNoteForm.note.trim()) {
		return {
			...state,
			saveNotice: 'Sleep note is required.'
		};
	}

	await logSleepNoteEvent(db, {
		localDay: state.localDay,
		note: state.sleepNoteForm.note,
		restfulness: parseOptionalNumber(state.sleepNoteForm.restfulness),
		context: state.sleepNoteForm.context
	});

	return reloadHealthPage(db, state, {
		saveNotice: 'Sleep context logged.',
		sleepNoteForm: createSleepNoteForm()
	});
}

export async function saveTemplatePage(
	db: HealthDatabase,
	state: HealthPageState
): Promise<HealthPageState> {
	if (!state.templateForm.label.trim()) {
		return {
			...state,
			saveNotice: 'Template name is required.'
		};
	}

	await saveHealthTemplate(db, {
		label: state.templateForm.label,
		templateType: state.templateForm.templateType,
		defaultDose: parseOptionalNumber(state.templateForm.defaultDose),
		defaultUnit: state.templateForm.defaultUnit,
		note: state.templateForm.note
	});

	return reloadHealthPage(db, state, {
		saveNotice: 'Template saved.',
		templateForm: createTemplateForm()
	});
}

export async function quickLogTemplatePage(
	db: HealthDatabase,
	state: HealthPageState,
	templateId: string
): Promise<HealthPageState> {
	await quickLogHealthTemplate(db, {
		localDay: state.localDay,
		templateId
	});

	return reloadHealthPage(db, state, {
		saveNotice: 'Template logged.'
	});
}
