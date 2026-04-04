import type { ExerciseCatalogItem } from '$lib/core/domain/types';
import { z } from 'zod';

type WgerEntity = Record<string, unknown>;

const wgerExerciseSchema = z.object({
	id: z.union([z.number(), z.string()]).optional(),
	uuid: z.string().optional(),
	name: z.string().optional(),
	exercise: z.unknown().optional(),
	exercises: z.unknown().optional(),
	description: z.string().optional(),
	instructions: z.string().optional(),
	comment: z.string().optional(),
	muscles: z.array(z.unknown()).optional(),
	equipment: z.array(z.unknown()).optional(),
	images: z.array(z.unknown()).optional(),
	image: z.string().optional()
})
	.passthrough()
	.refine(
		(value) =>
			value.id !== undefined || value.uuid !== undefined,
		{ message: 'Exercise payload is missing an identifier' }
	)
	.refine(
		(value) =>
			value.name !== undefined ||
			value.exercise !== undefined ||
			value.exercises !== undefined ||
			value.uuid !== undefined,
		{ message: 'Exercise payload is missing a resolvable title' }
	);

const wgerApiResponseSchema = z.object({
	results: z.array(wgerExerciseSchema).optional()
});

function extractText(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function extractName(value: unknown): string {
	if (!value) return '';
	if (typeof value === 'string') return value.trim();
	if (Array.isArray(value)) {
		for (const entry of value) {
			const name = extractName(entry);
			if (name) return name;
		}
		return '';
	}
	if (typeof value === 'object') {
		const entity = value as WgerEntity;
		return (
			extractText(entity.name) ||
			extractText(entity.name_en) ||
			extractText(entity.common_name) ||
			extractText(entity.translated_name) ||
			''
		);
	}
	return '';
}

function extractStringList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.map((entry) => extractName(entry)).filter(Boolean);
}

function buildExerciseTitle(entity: WgerEntity): string {
	return (
		extractText(entity.name) ||
		extractName(entity.exercise) ||
		extractName(entity.exercises) ||
		extractText(entity.uuid) ||
		'Untitled exercise'
	);
}

function buildInstructions(entity: WgerEntity): string | undefined {
	return (
		extractText(entity.description) ||
		extractText(entity.instructions) ||
		extractText(entity.comment) ||
		undefined
	);
}

function buildImageUrl(entity: WgerEntity): string | undefined {
	const images = entity.images;
	if (Array.isArray(images)) {
		for (const image of images) {
			if (typeof image === 'object' && image) {
				const imageEntity = image as WgerEntity;
				const url = extractText(imageEntity.image) || extractText(imageEntity.url);
				if (url) return url;
			}
		}
	}

	return extractText(entity.image) || undefined;
}

function normalizeWgerExercise(entity: WgerEntity): ExerciseCatalogItem {
	const externalId = String(entity.id ?? entity.uuid ?? '');
	return {
		id: `wger:${externalId}`,
		createdAt: new Date(0).toISOString(),
		updatedAt: new Date(0).toISOString(),
		sourceType: 'wger',
		externalId,
		title: buildExerciseTitle(entity),
		muscleGroups: extractStringList(entity.muscles),
		equipment: extractStringList(entity.equipment),
		instructions: buildInstructions(entity),
		imageUrl: buildImageUrl(entity)
	};
}

async function requestExercises(
	query: string,
	fetchImpl: typeof fetch,
	searchParam: 'search' | 'name'
): Promise<ExerciseCatalogItem[]> {
	const url = new URL('https://wger.de/api/v2/exercisebaseinfo/');
	url.searchParams.set('limit', '12');
	url.searchParams.set('language', '2');
	url.searchParams.set('ordering', 'name');
	url.searchParams.set(searchParam, query);

	const response = await fetchImpl(url, {
		headers: {
			accept: 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`wger request failed with ${response.status}`);
	}

	const parsed = wgerApiResponseSchema.safeParse(await response.json());
	if (!parsed.success) {
		throw new Error('Invalid wger response payload');
	}

	return (parsed.data.results ?? [])
		.map((entry) => normalizeWgerExercise(entry as WgerEntity))
		.filter((item) => item.externalId && item.title);
}

export async function searchWgerExercises(
	query: string,
	fetchImpl: typeof fetch = fetch
): Promise<ExerciseCatalogItem[]> {
	const normalized = query.trim();
	if (!normalized) {
		return [];
	}

	const searchResults = await requestExercises(normalized, fetchImpl, 'search');
	if (searchResults.length) {
		return searchResults;
	}

	return await requestExercises(normalized, fetchImpl, 'name');
}
