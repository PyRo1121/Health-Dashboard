<script lang="ts">
  import type { TodayRecommendationAction } from '$lib/features/today/intelligence';
  import type { TodayNutritionPulseMetric } from '$lib/features/today/model';
  import type { TodaySnapshot } from '$lib/features/today/snapshot';
  import TodayJournalPromptSection from '$lib/features/today/components/TodayJournalPromptSection.svelte';
  import TodayNutritionPulseSection from '$lib/features/today/components/TodayNutritionPulseSection.svelte';
  import TodayRecommendationSection from '$lib/features/today/components/TodayRecommendationSection.svelte';

  let {
    snapshot,
    todayNutritionPulseMetrics,
    todayNutritionGuidance,
    todayNutritionRows,
    plannedMealProjectionRows,
    recommendationSupportRows,
    onRecommendationAction,
  }: {
    snapshot: TodaySnapshot | null;
    todayNutritionPulseMetrics: TodayNutritionPulseMetric[];
    todayNutritionGuidance: string[];
    todayNutritionRows: string[];
    plannedMealProjectionRows: string[];
    recommendationSupportRows: string[];
    onRecommendationAction: (action: TodayRecommendationAction) => void;
  } = $props();
</script>

<TodayRecommendationSection {snapshot} {recommendationSupportRows} {onRecommendationAction} />

<TodayNutritionPulseSection
  {snapshot}
  {todayNutritionPulseMetrics}
  {todayNutritionGuidance}
  {todayNutritionRows}
  {plannedMealProjectionRows}
/>

<TodayJournalPromptSection {snapshot} />
