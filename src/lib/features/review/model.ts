import type { WeeklyReviewData } from '$lib/features/review/service';
import {
	buildNutritionIntentHref,
	type NutritionIntentHref
} from '$lib/features/nutrition/navigation';

export type ReviewSection = {
	title: string;
	items: string[];
	emptyTitle?: string;
	emptyMessage?: string;
	emphasis?: 'default' | 'strategy';
};

export type ReviewNutritionStrategyCard = {
	badge: string;
	title: string;
	detail: string;
	href: NutritionIntentHref;
	actionLabel: string;
};

function normalizeStrategyDetail(detail: string): string {
	const trimmed = detail.trim();
	return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

function createNutritionStrategyLine(item: WeeklyReviewData['nutritionStrategy'][number]): string {
	const prefix = item.kind === 'repeat' ? 'Repeat' : 'Rotate in';
	return `${prefix}: ${item.title} — ${normalizeStrategyDetail(item.detail)}`;
}

export function createReviewTrendRows(weekly: WeeklyReviewData | null): string[] {
	return weekly
		? [
				`Average mood: ${weekly.averageMood}`,
				`Average sleep: ${weekly.averageSleep} hours`,
				`Average protein: ${weekly.averageProtein}g`,
				`Sobriety streak: ${weekly.sobrietyStreak} day${weekly.sobrietyStreak === 1 ? '' : 's'}`
			]
		: [];
}

export function createNutritionStrategyCards(
	weekly: WeeklyReviewData | null
): ReviewNutritionStrategyCard[] {
	return weekly
		? weekly.nutritionStrategy.map((item) => ({
				badge: item.kind === 'repeat' ? 'Repeat' : 'Rotate in',
				title: item.title,
				detail: normalizeStrategyDetail(item.detail),
				href: buildNutritionIntentHref({
					kind: item.recommendationKind,
					id: item.recommendationId
				}),
				actionLabel: item.recommendationKind === 'food' ? 'Load food' : 'Load recipe'
			}))
		: [];
}

export function createReviewSections(weekly: WeeklyReviewData | null): ReviewSection[] {
	return weekly
		? [
				{
					title: 'Drift flags',
					items: weekly.snapshot.flags,
					emptyTitle: 'No major drift flagged.',
					emptyMessage: 'Keep logging for a fuller weekly signal.'
				},
				{
					title: 'Assessment changes',
					items: weekly.assessmentSummary,
					emptyMessage: 'No completed assessment changes this week yet.'
				},
				{
					title: 'Health highlights',
					items: weekly.healthHighlights,
					emptyMessage: 'Keep logging health context to unlock more useful weekly patterns.'
				},
				{
					title: 'Food adherence highlights',
					items: weekly.nutritionHighlights,
					emptyMessage: 'Nutrition needs a few more logged meals before highlights mean much.'
				},
				{
					title: 'Plan follow-through',
					items: weekly.planningHighlights,
					emptyMessage: 'Build a weekly plan before Review can compare intent against execution.'
				},
				{
					title: 'Repeat / rotate next week',
					items: weekly.nutritionStrategy.map(createNutritionStrategyLine),
					emptyMessage: 'Save more foods or recipes in Nutrition before the app can suggest what to repeat or rotate.',
					emphasis: 'strategy'
				},
				{
					title: 'Device highlights',
					items: weekly.deviceHighlights,
					emptyMessage: 'Import an iPhone companion bundle to bring passive device signals into review.'
				}
			]
		: [];
}
