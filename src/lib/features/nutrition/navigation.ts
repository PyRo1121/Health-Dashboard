export interface NutritionIntent {
	kind: 'food' | 'recipe';
	id: string;
}

export type NutritionIntentHref = `/nutrition?${string}`;

export function buildNutritionIntentHref(intent: NutritionIntent): NutritionIntentHref {
	const params = new URLSearchParams({
		loadKind: intent.kind,
		loadId: intent.id
	});

	return `/nutrition?${params.toString()}` as NutritionIntentHref;
}

export function readNutritionIntentFromSearch(search: string): NutritionIntent | null {
	const params = new URLSearchParams(search);
	const kind = params.get('loadKind');
	const id = params.get('loadId')?.trim();

	if ((kind !== 'food' && kind !== 'recipe') || !id) {
		return null;
	}

	return {
		kind,
		id
	};
}

export function clearNutritionIntentFromLocation(
	location: Pick<Location, 'pathname' | 'search' | 'hash'>,
	history: Pick<History, 'replaceState' | 'state'>
): void {
	const params = new URLSearchParams(location.search);
	params.delete('loadKind');
	params.delete('loadId');

	const nextSearch = params.toString();
	const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}${location.hash ?? ''}`;

	history.replaceState(history.state, '', nextUrl);
}
