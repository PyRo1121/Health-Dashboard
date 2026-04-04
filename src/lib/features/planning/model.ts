import type {
	ExerciseCatalogItem,
	FoodCatalogItem,
	GroceryItem,
	PlanSlot,
	RecipeCatalogItem,
	WorkoutTemplateExerciseRef,
	WorkoutTemplate
} from '$lib/core/domain/types';

export interface PlanningSlotFormState {
	localDay: string;
	slotType: PlanSlot['slotType'];
	mealSource: 'recipe' | 'food';
	recipeId: string;
	foodCatalogItemId: string;
	workoutTemplateId: string;
	title: string;
	notes: string;
}

export interface WorkoutTemplateFormState {
	title: string;
	goal: string;
	exercises: WorkoutTemplateExerciseRef[];
}

export interface ExerciseSearchRow {
	id: string;
	title: string;
	detail: string;
}

export interface PlanningBoardDay {
	localDay: string;
	label: string;
	slots: PlanSlot[];
}

export interface GroceryGroup {
	aisle: string;
	items: GroceryItem[];
}

function weekdayLabel(localDay: string): string {
	const date = new Date(`${localDay}T00:00:00.000Z`);
	return new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	}).format(date);
}

export function createPlanningSlotForm(localDay: string): PlanningSlotFormState {
	return {
		localDay,
		slotType: 'meal',
		mealSource: 'recipe',
		recipeId: '',
		foodCatalogItemId: '',
		workoutTemplateId: '',
		title: '',
		notes: ''
	};
}

export function createWorkoutTemplateForm(): WorkoutTemplateFormState {
	return {
		title: '',
		goal: '',
		exercises: [{ name: '', reps: '' }]
	};
}

export function createExerciseSearchRows(items: ExerciseCatalogItem[]): ExerciseSearchRow[] {
	return items.map((item) => ({
		id: item.id,
		title: item.title,
		detail: [...item.muscleGroups, ...item.equipment].filter(Boolean).join(' · ') || 'Exercise'
	}));
}

export function addExerciseDraft(
	current: WorkoutTemplateExerciseRef[],
	exercise: ExerciseCatalogItem | string | undefined = undefined
): WorkoutTemplateExerciseRef[] {
	const title = typeof exercise === 'string' ? exercise : exercise?.title ?? '';
	if (title && current.some((item) => item.name.trim().toLowerCase() === title.trim().toLowerCase())) {
		return current;
	}

	if (title) {
		const emptyIndex = current.findIndex((item) => !item.name.trim());
		if (emptyIndex >= 0) {
			return current.map((item, index) =>
				index === emptyIndex
					? {
							...item,
							name: title,
							exerciseCatalogId: typeof exercise === 'string' ? undefined : exercise?.id
						}
					: item
			);
		}
	}

	return [
		...current,
		{
			name: title,
			exerciseCatalogId: typeof exercise === 'string' ? undefined : exercise?.id,
			reps: ''
		}
	];
}

export function updateExerciseDraftField(
	current: WorkoutTemplateExerciseRef[],
	index: number,
	field: keyof WorkoutTemplateExerciseRef,
	value: string
): WorkoutTemplateExerciseRef[] {
	return current.map((item, itemIndex) => {
		if (itemIndex !== index) return item;

		if (field === 'sets' || field === 'restSeconds') {
			return {
				...item,
				[field]: value.trim() ? Number(value) : undefined
			};
		}

		return {
			...item,
			exerciseCatalogId: field === 'name' ? undefined : item.exerciseCatalogId,
			[field]: value
		};
	});
}

export function removeExerciseDraft(
	current: WorkoutTemplateExerciseRef[],
	index: number
): WorkoutTemplateExerciseRef[] {
	if (current.length <= 1) {
		return [{ name: '', reps: '' }];
	}

	return current.filter((_, itemIndex) => itemIndex !== index);
}

export function normalizeExerciseDrafts(
	current: WorkoutTemplateExerciseRef[]
): WorkoutTemplateExerciseRef[] {
	return current
		.map((item) => ({
			name: item.name.trim(),
			exerciseCatalogId: item.exerciseCatalogId,
			sets: item.sets,
			reps: item.reps?.trim() || undefined,
			restSeconds: item.restSeconds
		}))
		.filter((item) => item.name);
}

export function createPlanningBoardDays(
	weekDays: string[],
	slots: PlanSlot[]
): PlanningBoardDay[] {
	return weekDays.map((localDay) => ({
		localDay,
		label: weekdayLabel(localDay),
		slots: slots.filter((slot) => slot.localDay === localDay)
	}));
}

export function createSlotSummary(
	slot: PlanSlot,
	foods: FoodCatalogItem[],
	recipes: RecipeCatalogItem[],
	workoutTemplates: WorkoutTemplate[],
	exerciseCatalogItems: ExerciseCatalogItem[] = []
): string {
	if (slot.slotType === 'meal' && slot.itemType === 'food' && slot.itemId) {
		const food = foods.find((candidate) => candidate.id === slot.itemId);
		if (!food) {
			return 'Saved food no longer available';
		}

		return [
			'Saved food',
			food.sourceName,
			food.protein ? `${food.protein}g protein` : ''
		]
			.filter(Boolean)
			.join(' · ');
	}

	if (slot.slotType === 'meal' && slot.itemId) {
		const recipe = recipes.find((candidate) => candidate.id === slot.itemId);
		return recipe ? [recipe.mealType, recipe.cuisine].filter(Boolean).join(' · ') || 'Recipe plan' : 'Recipe no longer available';
	}

	if (slot.slotType === 'workout' && slot.itemId) {
		const template = workoutTemplates.find((candidate) => candidate.id === slot.itemId);
		if (!template) {
			return 'Workout template no longer available';
		}

		const exerciseCount = template.exerciseRefs.length;
		const firstExercise = template.exerciseRefs[0];
		const catalogExercise = firstExercise?.exerciseCatalogId
			? exerciseCatalogItems.find((candidate) => candidate.id === firstExercise.exerciseCatalogId)
			: null;
		const focus = [...(catalogExercise?.muscleGroups ?? []), ...(catalogExercise?.equipment ?? [])]
			.filter(Boolean)
			.slice(0, 2)
			.join(' · ');
		return [
			template.goal ?? 'Workout plan',
			exerciseCount ? `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}` : '',
			focus
		]
			.filter(Boolean)
			.join(' · ');
	}

	return slot.notes || 'Plan note';
}

export function createGrocerySummary(item: GroceryItem): string {
	const badges = [
		item.quantityText,
		item.onHand ? 'On hand' : '',
		item.excluded ? 'Excluded' : '',
		item.checked ? 'Checked' : ''
	].filter(Boolean);

	return [item.aisle, ...badges].filter(Boolean).join(' · ');
}

export function createGroceryGroups(items: GroceryItem[]): GroceryGroup[] {
	const groups = new Map<string, GroceryItem[]>();

	for (const item of items) {
		const aisle = item.aisle ?? 'Other';
		const current = groups.get(aisle) ?? [];
		current.push(item);
		groups.set(aisle, current);
	}

	return [...groups.entries()]
		.sort((left, right) => left[0].localeCompare(right[0]))
		.map(([aisle, groupedItems]) => ({
			aisle,
			items: [...groupedItems].sort((left, right) => left.label.localeCompare(right.label))
		}));
}

export function createRecipeSourceSummary(
	item: GroceryItem,
	recipes: RecipeCatalogItem[]
): string {
	const titles = item.sourceRecipeIds
		.map((recipeId) => recipes.find((candidate) => candidate.id === recipeId)?.title)
		.filter(Boolean) as string[];

	return titles.join(', ');
}

export function createWorkoutTemplateSummary(template: WorkoutTemplate): string {
	const firstExercise = template.exerciseRefs[0];
	const catalogHint = firstExercise?.exerciseCatalogId ? 'Linked exercise' : '';
	const firstExerciseSummary = firstExercise
		? [
				firstExercise.name,
				firstExercise.sets && firstExercise.reps ? `${firstExercise.sets}x${firstExercise.reps}` : firstExercise.reps,
				firstExercise.restSeconds ? `${firstExercise.restSeconds}s rest` : '',
				catalogHint
			]
				.filter(Boolean)
				.join(' · ')
		: '';

	return [
		template.goal,
		`${template.exerciseRefs.length} exercise${template.exerciseRefs.length === 1 ? '' : 's'}`,
		firstExerciseSummary
	]
		.filter(Boolean)
		.join(' · ');
}
