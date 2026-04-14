<script lang="ts">
  import { resolve } from '$app/paths';
  import type {
    TodayRecommendationAction,
    TodayRecommendationHref,
  } from '$lib/features/today/intelligence';
  import { isTodayRecommendationHrefAction } from '$lib/features/today/model';

  let {
    action,
    classes,
    onAction,
  }: {
    action: TodayRecommendationAction;
    classes: string;
    onAction: (action: TodayRecommendationAction) => void;
  } = $props();

  function isHashHref(href: TodayRecommendationHref): href is `#${string}` {
    return href.startsWith('#');
  }

  function scrollToHashTarget(href: `#${string}`) {
    const targetId = href.slice(1);
    if (!targetId) {
      return;
    }

    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleHashHrefClick(href: TodayRecommendationHref) {
    if (!isHashHref(href)) {
      return;
    }

    scrollToHashTarget(href);
  }
</script>

{#if isTodayRecommendationHrefAction(action)}
  {#if isHashHref(action.href)}
    <button class={classes} type="button" onclick={() => handleHashHrefClick(action.href)}
      >{action.label}</button
    >
  {:else}
    <a class={classes} href={resolve(action.href)}>{action.label}</a>
  {/if}
{:else}
  <button class={classes} type="button" onclick={() => onAction(action)}>{action.label}</button>
{/if}
