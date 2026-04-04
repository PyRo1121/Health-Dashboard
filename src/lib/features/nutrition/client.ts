import { currentLocalDay } from '$lib/core/domain/time';
import { postFeatureRequest, runFeatureMode } from '$lib/core/http/feature-client';
import {
	applyNutritionBarcodeMatch,
	applyNutritionRecipeMatches,
	applyNutritionSearchMatches,
	applyPackagedNutritionMatches,
	clearNutritionPlannedMeal as clearNutritionPlannedMealController,
	createNutritionPageState,
	loadNutritionPage as loadNutritionPageController,
	planNutritionMeal as planNutritionMealController,
	reuseNutritionMeal as reuseNutritionMealController,
	updateNutritionBarcode,
	updateNutritionPackagedSearch,
	updateNutritionRecipeSearch,
	saveNutritionCatalogItem as saveNutritionCatalogItemController,
	saveNutritionMeal as saveNutritionMealController,
	saveNutritionRecurringMeal as saveNutritionRecurringMealController,
	selectNutritionMatch,
	useNutritionRecipe,
	updateNutritionSearch,
	type NutritionCatalogItemDraft,
	type NutritionMealDraft,
	type NutritionPageState,
	type NutritionPlannedMealDraft,
	type NutritionRecurringMealDraft
} from './controller';
import {
	findFoodCatalogItemByBarcode,
	listFoodCatalogItems,
	listRecipeCatalogItems,
	searchFoodData,
	searchPackagedFoodCatalog,
	type FoodLookupResult
} from './service';
import type { RecipeCatalogItem } from '$lib/core/domain/types';

export {
	createNutritionPageState,
	updateNutritionBarcode,
	updateNutritionPackagedSearch,
	updateNutritionRecipeSearch,
	updateNutritionSearch
};

export async function loadNutritionPage(
	state: NutritionPageState,
	localDay = currentLocalDay()
): Promise<NutritionPageState> {
	return await postFeatureRequest(
		'/api/nutrition',
		{
			action: 'load',
			localDay,
			state
		},
		(db) => loadNutritionPageController(db, localDay, state)
	);
}

export async function saveNutritionMeal(
	state: NutritionPageState,
	draft: NutritionMealDraft
): Promise<NutritionPageState> {
	return await postFeatureRequest(
		'/api/nutrition',
		{
			action: 'saveMeal',
			state,
			draft
		},
		(db) => saveNutritionMealController(db, state, draft)
	);
}

export async function saveNutritionRecurringMeal(
	state: NutritionPageState,
	draft: NutritionRecurringMealDraft
): Promise<NutritionPageState> {
	return await postFeatureRequest(
		'/api/nutrition',
		{
			action: 'saveRecurringMeal',
			state,
			draft
		},
		(db) => saveNutritionRecurringMealController(db, state, draft)
	);
}

export async function saveNutritionCatalogItem(
	state: NutritionPageState,
	draft: NutritionCatalogItemDraft
): Promise<NutritionPageState> {
	return await postFeatureRequest(
		'/api/nutrition',
		{
			action: 'saveCatalogItem',
			state,
			draft
		},
		(db) => saveNutritionCatalogItemController(db, state, draft)
	);
}

export async function planNutritionMeal(
	state: NutritionPageState,
	draft: NutritionPlannedMealDraft
): Promise<NutritionPageState> {
	return await postFeatureRequest(
		'/api/nutrition',
		{
			action: 'planMeal',
			state,
			draft
		},
		(db) => planNutritionMealController(db, state, draft)
	);
}

export async function clearNutritionPlannedMeal(
	state: NutritionPageState
): Promise<NutritionPageState> {
	return await postFeatureRequest(
		'/api/nutrition',
		{
			action: 'clearPlannedMeal',
			state
		},
		(db) => clearNutritionPlannedMealController(db, state)
	);
}

export async function searchPackagedFoods(state: NutritionPageState): Promise<NutritionPageState> {
	const packagedMatches = await postFeatureRequest(
		'/api/nutrition/search-packaged',
		{
			query: state.packagedQuery
		},
		async (db) => searchPackagedFoodCatalog(state.packagedQuery, await listFoodCatalogItems(db))
	);

	return applyPackagedNutritionMatches(
		state,
		packagedMatches,
		packagedMatches.length ? '' : 'No packaged food matches found.'
	);
}

export async function searchNutritionFoods(state: NutritionPageState): Promise<NutritionPageState> {
	const response = await postFeatureRequest<{ matches: FoodLookupResult[]; notice?: string }>(
		'/api/nutrition/search-usda',
		{
			query: state.searchQuery
		},
		async (db) => ({
			matches: searchFoodData(state.searchQuery, await listFoodCatalogItems(db))
		})
	);

	return applyNutritionSearchMatches(state, response.matches, response.notice ?? '');
}

export async function useNutritionMatch(
	state: NutritionPageState,
	match: FoodLookupResult
): Promise<NutritionPageState> {
	if (match.isEnriched !== false || !match.externalId) {
		return selectNutritionMatch(state, match);
	}

	const externalId = match.externalId;

	return await runFeatureMode(
		async () => selectNutritionMatch(state, match),
		async () => {
			const enriched = await postFeatureRequest<FoodLookupResult>(
				`/api/nutrition/enrich/${encodeURIComponent(externalId)}`,
				{},
				async () => match
			);

			return selectNutritionMatch(
				{
					...state,
					searchNotice: 'USDA result enriched and cached locally.'
				},
				enriched
			);
		}
	);
}

export async function lookupPackagedBarcode(state: NutritionPageState): Promise<NutritionPageState> {
	const match = await postFeatureRequest<FoodLookupResult | null>(
		`/api/nutrition/barcode/${encodeURIComponent(state.barcodeQuery)}`,
		{},
		async (db) => findFoodCatalogItemByBarcode(state.barcodeQuery, await listFoodCatalogItems(db))
	);

	return applyNutritionBarcodeMatch(state, match);
}

export async function searchNutritionRecipes(state: NutritionPageState): Promise<NutritionPageState> {
	const recipeMatches = await postFeatureRequest(
		'/api/nutrition/search-recipes',
		{
			query: state.recipeQuery
		},
		(db) => listRecipeCatalogItems(db)
	);

	return applyNutritionRecipeMatches(
		state,
		recipeMatches,
		recipeMatches.length ? '' : 'No recipe ideas found.'
	);
}

export function useNutritionRecipeIdea(
	state: NutritionPageState,
	recipe: RecipeCatalogItem
): NutritionPageState {
	return useNutritionRecipe(state, recipe);
}

export async function reuseNutritionMeal(
	state: NutritionPageState,
	favoriteMealId: string
): Promise<NutritionPageState> {
	return await postFeatureRequest(
		'/api/nutrition',
		{
			action: 'reuseMeal',
			state,
			favoriteMealId
		},
		(db) => reuseNutritionMealController(db, state, favoriteMealId)
	);
}
