<script lang="ts">
  import { resolve } from '$app/paths';
  import type { DeviceSourceManifest } from '$lib/features/integrations/manifests/device-sources';
  import type { ImportSourceType } from '$lib/core/domain/types';
  import type { ImportPayloadSummary } from './core';

  interface Props {
    summary: ImportPayloadSummary;
    manifest: DeviceSourceManifest;
    sourceLabels: Record<ImportSourceType, string>;
  }

  let { summary, manifest, sourceLabels }: Props = $props();
</script>

<div
  class={`summary-card summary-card--${summary.status} ${
    summary.status === 'ready'
      ? 'surface-tone--ready'
      : summary.status === 'warning'
        ? 'surface-tone--warning'
        : 'surface-tone--risk'
  }`}
  aria-label="Import payload summary"
>
  <strong>{summary.headline}</strong>
  <p class="status-copy">{summary.detail}</p>
  {#if summary.inferredSourceType}
    <p class="status-copy">
      Detected source: {sourceLabels[summary.inferredSourceType]}
    </p>
  {/if}
  {#if summary.itemCount !== undefined && summary.itemLabel}
    <p class="status-copy">
      {summary.itemCount}
      {summary.itemLabel}
    </p>
  {/if}
  {#if summary.metricTypes?.length}
    <p class="status-copy">
      Metrics: {summary.metricTypes.join(', ')}
    </p>
  {/if}
  {#if ['invalid', 'unknown'].includes(summary.status) && summary.inferredSourceType === 'healthkit-companion'}
    <p class="summary-links link-row">
      <a href={resolve(manifest.downloadTemplatePath)} download>Download template JSON</a>
      <a href={resolve(manifest.downloadBlueprintPath)} target="_blank" rel="noreferrer">
        Open shortcut blueprint
      </a>
    </p>
  {/if}
</div>

<style>
  .summary-card {
    display: grid;
    gap: 0.35rem;
    padding: 0.9rem 1rem;
    border: 0.5px solid var(--phc-border-soft);
  }

  .summary-links {
    margin: 0.5rem 0 0;
  }

  .status-copy {
    color: var(--phc-muted);
    font: 400 0.95rem/1.5 var(--phc-font-ui);
    margin: 0;
  }
</style>
