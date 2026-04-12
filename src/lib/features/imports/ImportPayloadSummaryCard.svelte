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

<div class={`summary-card summary-card--${summary.status}`} aria-label="Import payload summary">
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
    <p class="summary-links">
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
    border-radius: 1rem;
    border: 1px solid rgba(31, 29, 26, 0.08);
  }

  .summary-card--ready {
    background: rgba(31, 92, 74, 0.08);
  }

  .summary-card--warning {
    background: rgba(181, 84, 60, 0.12);
  }

  .summary-card--invalid,
  .summary-card--unknown {
    background: rgba(123, 45, 38, 0.12);
  }

  .summary-links {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin: 0.5rem 0 0;
  }

  .summary-links a {
    color: #1f5c4a;
    font-weight: 600;
  }

  .status-copy {
    color: #655e54;
    font:
      400 0.95rem/1.5 Manrope,
      system-ui,
      sans-serif;
    margin: 0;
  }
</style>
