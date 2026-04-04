import type { HealthDatabase } from '$lib/core/db/types';
import type {
	FavoriteMeal,
	FoodCatalogItem,
	FoodEntry,
	PlannedMeal,
	RecipeCatalogItem
} from '$lib/core/domain/types';
import {
	createNutritionForm,
	mergeNutritionFormWithDraft,
	type NutritionFormState
} from './model';
import {
	attachNutrientsToFoodEntry,
	buildNutritionRecommendationContext,
	buildDailyNutritionSummary,
	clearPlannedMeal,
	createFoodEntry,
	getPlannedMeal,
	listFoodCatalogItems,
	listRecipeCatalogItems,
	listFavoriteMeals,
	reuseRecurringMeal,
	saveFoodCatalogItem,
	saveFavoriteMeal,
	savePlannedMeal,
	searchFoodData,
	type FoodLookupResult
} from '$lib/features/nutrition/service';

export interface NutritionPageState {
	loading: boolean;
	localDay: string;
	saveNotice: string;
	searchNotice: string;
	packagedNotice: string;
	recipeNotice: string;
	summary: { calories: number; protein: number; fiber: number; carbs: number; fat: number; entries: FoodEntry[] };
	favoriteMeals: FavoriteMeal[];
	catalogItems: FoodCatalogItem[];
	recipeCatalogItems: RecipeCatalogItem[];
	plannedMeal: PlannedMeal | null;
	searchQuery: string;
	matches: FoodLookupResult[];
	packagedQuery: string;
	barcodeQuery: string;
	packagedMatches: FoodLookupResult[];
	recipeQuery: string;
	recipeMatches: RecipeCatalogItem[];
	selectedMatch: FoodLookupResult | null;
	form: NutritionFormState;
	recommendationContext: {
		sleepHours?: number;
		sleepQuality?: number;
		anxietyCount: number;
		symptomCount: number;
	};
}

export function createNutritionPageState(): NutritionPageState {
	return {
		loading: true,
		localDay: '',
		saveNotice: '',
		searchNotice: '',
		packagedNotice: '',
		recipeNotice: '',
		summary: {
			calories: 0,
			protein: 0,
			fiber: 0,
			carbs: 0,
			fat: 0,
			entries: []
		},
		favoriteMeals: [],
		catalogItems: [],
		recipeCatalogItems: [],
		plannedMeal: null,
		searchQuery: '',
		matches: [],
		packagedQuery: '',
		barcodeQuery: '',
		packagedMatches: [],
		recipeQuery: '',
		recipeMatches: [],
		selectedMatch: null,
		form: createNutritionForm(),
		recommendationContext: {
			anxietyCount: 0,
			symptomCount: 0
		}
	};
}

interface NutritionMacroDraft {
	name: string;
	calories: number;
	protein: number;
	fiber: number;
	carbs: number;
	fat: number;
	sourceName?: string;
}

export interface NutritionMealDraft extends NutritionMacroDraft {
	localDay: string;
	mealType: string;
	notes: string;
}

export interface NutritionRecurringMealDraft extends NutritionMacroDraft {
	mealType: string;
}

export interface NutritionPlannedMealDraft extends NutritionRecurringMealDraft {
	notes: string;
}

export interface NutritionCatalogItemDraft {
	name: string;
	calories: number;
	protein: number;
	fiber: number;
	carbs: number;
	fat: number;
}

async function reloadNutritionPageState(
	db: HealthDatabase,
	state: NutritionPageState,
	overrides: Partial<NutritionPageState> = {}
): Promise<NutritionPageState> {
	const next = await loadNutritionPage(db, state.localDay, state);
	return {
		...next,
		...overrides
	};
}

export async function loadNutritionPage(
	db: HealthDatabase,
	localDay: string,
	state: NutritionPageState
): Promise<NutritionPageState> {
	const [summary, favoriteMeals, catalogItems, recipeCatalogItems, plannedMeal, recommendationContext] = await Promise.all([
		buildDailyNutritionSummary(db, localDay),
		listFavoriteMeals(db),
		listFoodCatalogItems(db),
		listRecipeCatalogItems(db),
		getPlannedMeal(db),
		buildNutritionRecommendationContext(db, localDay)
	]);

	return {
		...state,
		loading: false,
		localDay,
		summary,
		favoriteMeals,
		catalogItems,
		recipeCatalogItems,
		plannedMeal,
		recommendationContext
	};
}

export function updateNutritionSearch(
	state: NutritionPageState,
	searchQuery: string
): NutritionPageState {
	return {
		...state,
		searchQuery,
		searchNotice: '',
		packagedNotice: ''
	};
}

export function updateNutritionRecipeSearch(
	state: NutritionPageState,
	recipeQuery: string
): NutritionPageState {
	return {
		...state,
		recipeQuery,
		recipeNotice: ''
	};
}

export function updateNutritionPackagedSearch(
	state: NutritionPageState,
	packagedQuery: string
): NutritionPageState {
	return {
		...state,
		packagedQuery,
		packagedNotice: ''
	};
}

export function updateNutritionBarcode(
	state: NutritionPageState,
	barcodeQuery: string
): NutritionPageState {
	return {
		...state,
		barcodeQuery,
		packagedNotice: ''
	};
}

export function runNutritionSearch(state: NutritionPageState): NutritionPageState {
	return {
		...state,
		matches: searchFoodData(state.searchQuery, state.catalogItems),
		searchNotice: '',
		packagedNotice: ''
	};
}

export function applyNutritionSearchMatches(
	state: NutritionPageState,
	matches: FoodLookupResult[],
	searchNotice = ''
): NutritionPageState {
	return {
		...state,
		matches,
		searchNotice
	};
}

export function applyPackagedNutritionMatches(
	state: NutritionPageState,
	packagedMatches: FoodLookupResult[],
	packagedNotice = ''
): NutritionPageState {
	return {
		...state,
		packagedMatches,
		packagedNotice
	};
}

export function applyNutritionRecipeMatches(
	state: NutritionPageState,
	recipeMatches: RecipeCatalogItem[],
	recipeNotice = ''
): NutritionPageState {
	return {
		...state,
		recipeMatches,
		recipeNotice
	};
}

export function applyNutritionBarcodeMatch(
	state: NutritionPageState,
	match: FoodLookupResult | null
): NutritionPageState {
	if (!match) {
		return {
			...state,
			packagedMatches: [],
			packagedNotice: 'No packaged food found for that barcode.'
		};
	}

	return {
		...selectNutritionMatch(
			{
				...state,
				packagedMatches: [match]
			},
			match
		),
		packagedNotice: 'Packaged food loaded from barcode.'
	};
}

export function selectNutritionMatch(
	state: NutritionPageState,
	match: FoodLookupResult
): NutritionPageState {
	return {
		...state,
		selectedMatch: match,
		searchNotice: '',
		form: mergeNutritionFormWithDraft(
			state.form,
			attachNutrientsToFoodEntry(
				{
					localDay: state.localDay,
					mealType: state.form.mealType,
					name: state.form.name
				},
				match
			)
		)
	};
}

export async function saveNutritionMeal(
	db: HealthDatabase,
	state: NutritionPageState,
	draft: NutritionMealDraft
): Promise<NutritionPageState> {
	await createFoodEntry(db, draft);
	return await reloadNutritionPageState(db, state, {
		saveNotice: 'Meal saved.'
	});
}

export async function saveNutritionRecurringMeal(
	db: HealthDatabase,
	state: NutritionPageState,
	draft: NutritionRecurringMealDraft
): Promise<NutritionPageState> {
	await saveFavoriteMeal(db, {
		name: draft.name || 'Quick oatmeal',
		mealType: draft.mealType,
		items: [
			{
				name: draft.name || 'Untitled meal',
				calories: draft.calories,
				protein: draft.protein,
				fiber: draft.fiber,
				carbs: draft.carbs,
				fat: draft.fat,
				sourceName: draft.sourceName
			}
		]
	});
	return await reloadNutritionPageState(db, state, {
		saveNotice: 'Recurring meal saved.'
	});
}

export async function saveNutritionCatalogItem(
	db: HealthDatabase,
	state: NutritionPageState,
	draft: NutritionCatalogItemDraft
): Promise<NutritionPageState> {
	if (!draft.name.trim()) {
		return {
			...state,
			saveNotice: 'Custom food name is required.'
		};
	}

	await saveFoodCatalogItem(db, {
		name: draft.name.trim(),
		calories: draft.calories,
		protein: draft.protein,
		fiber: draft.fiber,
		carbs: draft.carbs,
		fat: draft.fat
	});

	return await reloadNutritionPageState(db, state, {
		saveNotice: 'Saved to custom food catalog.'
	});
}

export async function planNutritionMeal(
	db: HealthDatabase,
	state: NutritionPageState,
	draft: NutritionPlannedMealDraft
): Promise<NutritionPageState> {
	if (!draft.name.trim()) {
		return {
			...state,
			saveNotice: 'Plan needs a meal name.'
		};
	}

	await savePlannedMeal(db, {
		name: draft.name.trim(),
		mealType: draft.mealType,
		calories: draft.calories,
		protein: draft.protein,
		fiber: draft.fiber,
		carbs: draft.carbs,
		fat: draft.fat,
		sourceName: draft.sourceName,
		notes: draft.notes.trim() || undefined
	});
	return await reloadNutritionPageState(db, state, {
		saveNotice: 'Planned next meal saved.'
	});
}

export async function clearNutritionPlannedMeal(
	db: HealthDatabase,
	state: NutritionPageState
): Promise<NutritionPageState> {
	await clearPlannedMeal(db);
	return await reloadNutritionPageState(db, state, {
		saveNotice: 'Planned meal cleared.'
	});
}

export function useNutritionRecipe(
	state: NutritionPageState,
	recipe: RecipeCatalogItem
): NutritionPageState {
	return {
		...state,
		recipeNotice: `Loaded ${recipe.title} into the meal form.`,
		form: {
			...state.form,
			name: recipe.title,
			notes: recipe.ingredients.slice(0, 4).join(', ')
		}
	};
}

export async function reuseNutritionMeal(
	db: HealthDatabase,
	state: NutritionPageState,
	favoriteMealId: string
): Promise<NutritionPageState> {
	await reuseRecurringMeal(db, { favoriteMealId, localDay: state.localDay });
	return await reloadNutritionPageState(db, state, {
		saveNotice: 'Recurring meal reused.'
	});
}
