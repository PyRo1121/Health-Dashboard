import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
	loadNutritionPage,
	planNutritionMeal,
	reuseNutritionMeal,
	clearNutritionPlannedMeal,
	saveNutritionCatalogItem,
	saveNutritionMeal,
	saveNutritionRecurringMeal,
	type NutritionCatalogItemDraft,
	type NutritionMealDraft,
	type NutritionPageState,
	type NutritionPlannedMealDraft,
	type NutritionRecurringMealDraft
} from '$lib/features/nutrition/controller';

type NutritionRequest =
	| { action: 'load'; localDay: string; state: NutritionPageState }
	| { action: 'saveMeal'; state: NutritionPageState; draft: NutritionMealDraft }
	| { action: 'planMeal'; state: NutritionPageState; draft: NutritionPlannedMealDraft }
	| { action: 'saveRecurringMeal'; state: NutritionPageState; draft: NutritionRecurringMealDraft }
	| { action: 'saveCatalogItem'; state: NutritionPageState; draft: NutritionCatalogItemDraft }
	| { action: 'clearPlannedMeal'; state: NutritionPageState }
	| { action: 'reuseMeal'; state: NutritionPageState; favoriteMealId: string };

export const POST = createDbActionPostHandler<NutritionRequest, NutritionPageState>({
	load: (db, body) => loadNutritionPage(db, body.localDay, body.state),
	saveMeal: (db, body) => saveNutritionMeal(db, body.state, body.draft),
	planMeal: (db, body) => planNutritionMeal(db, body.state, body.draft),
	saveRecurringMeal: (db, body) => saveNutritionRecurringMeal(db, body.state, body.draft),
	saveCatalogItem: (db, body) => saveNutritionCatalogItem(db, body.state, body.draft),
	clearPlannedMeal: (db, body) => clearNutritionPlannedMeal(db, body.state),
	reuseMeal: (db, body) => reuseNutritionMeal(db, body.state, body.favoriteMealId)
});
