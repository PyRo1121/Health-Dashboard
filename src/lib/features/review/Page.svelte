<script lang="ts">
  import ReviewAdherenceSection from '$lib/features/review/components/ReviewAdherenceSection.svelte';
  import ReviewCorrelationSection from '$lib/features/review/components/ReviewCorrelationSection.svelte';
  import ReviewExperimentSection from '$lib/features/review/components/ReviewExperimentSection.svelte';
  import ReviewHeadlineSection from '$lib/features/review/components/ReviewHeadlineSection.svelte';
  import ReviewListSection from '$lib/features/review/components/ReviewListSection.svelte';
  import ReviewStrategySection from '$lib/features/review/components/ReviewStrategySection.svelte';
  import {
    createReviewPageState,
    loadReviewPage,
    saveReviewExperimentPage,
    setReviewExperiment,
  } from '$lib/features/review/client';
  import {
    createReviewDecisionCards,
    createReviewAdherenceAuditItems,
    createReviewAdherenceCards,
    createWeeklyRecommendationView,
    createReviewSections,
    createReviewTrendRows,
  } from '$lib/features/review/model';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';

  let page = $state(createReviewPageState());
  let trendRows = $derived(createReviewTrendRows(page.weekly));
  let weeklyRecommendation = $derived(createWeeklyRecommendationView(page.weekly));
  let reviewDecisionCards = $derived(createReviewDecisionCards(page.weekly));
  let reviewSections = $derived(createReviewSections(page.weekly));
  let adherenceCards = $derived(createReviewAdherenceCards(page.weekly));
  let adherenceAuditItems = $derived(createReviewAdherenceAuditItems(page.weekly));

  async function loadWeekly() {
    page = await loadReviewPage();
  }

  async function saveExperiment() {
    page = await saveReviewExperimentPage(page);
  }

  onBrowserRouteMount(loadWeekly);
</script>

<RoutePageHeader href="/review" />

{#if page.loading}
  <p class="status-copy">Building weekly briefing…</p>
{:else if page.weekly}
  {#if page.loadNotice}
    <p class="status-copy">{page.loadNotice}</p>
  {/if}
  <div class="page-grid review-grid">
    <ReviewHeadlineSection
      headline={page.weekly.snapshot.headline}
      daysTracked={page.weekly.snapshot.daysTracked}
      recommendation={weeklyRecommendation}
    />

    <ReviewListSection
      section={{
        title: 'Trends',
        items: trendRows,
      }}
    />

    <ReviewAdherenceSection {adherenceCards} auditItems={adherenceAuditItems} />

    <ReviewCorrelationSection correlations={page.weekly.snapshot.correlations} />

    {#each reviewSections as section (section.title)}
      {#if section.title === 'Repeat / rotate / skip next week'}
        <ReviewStrategySection
          cards={reviewDecisionCards}
          emptyMessage={section.emptyMessage ?? ''}
        />
      {:else}
        <ReviewListSection {section} />
      {/if}
    {/each}

    <ReviewExperimentSection
      options={page.weekly.experimentOptions}
      selectedExperiment={page.selectedExperiment}
      savedExperiment={page.weekly.snapshot.experiment}
      saveNotice={page.saveNotice}
      onSelectExperiment={(value) => {
        page = setReviewExperiment(page, value);
      }}
      onSaveExperiment={saveExperiment}
    />
  </div>
{/if}

<style>
  @media (min-width: 960px) {
    .review-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .review-grid :global(section:first-child) {
      grid-column: 1 / -1;
    }
  }
</style>
