<script lang="ts">
  import { resolve } from '$app/paths';
  import type { DeviceSourceManifest } from '$lib/features/integrations/manifests/device-sources';
  import { buildNoMacSetupModel } from '$lib/features/integrations/setup-presenters';

  interface Props {
    manifest: DeviceSourceManifest;
    showNavigationLinks?: boolean;
  }

  let { manifest, showNavigationLinks = true }: Props = $props();
  let setupModel = $derived(buildNoMacSetupModel(manifest, showNavigationLinks));
</script>

<div class="setup-stack">
  <div class="resource-card soft-panel">
    <p class="eyebrow">No-Mac Path</p>
    <p class="resource-copy">
      {setupModel.resourceDescription}
    </p>
    <p class="resource-links link-row">
      {#each setupModel.primaryLinks as link (link.label)}
        <a
          href={resolve(link.route)}
          download={link.download ? '' : undefined}
          target={link.download ? undefined : '_blank'}
          rel={link.download ? undefined : 'noreferrer'}
        >
          {link.label}
        </a>
      {/each}
    </p>
    {#if setupModel.navigationLinks.length}
      <p class="resource-links link-row">
        {#each setupModel.navigationLinks as link (link.label)}
          <a href={resolve(link.route)}>{link.label}</a>
        {/each}
      </p>
    {/if}
  </div>

  <ol class="step-list">
    {#each setupModel.steps as step, index (step.title)}
      <li>
        <div class="step-index">{index + 1}</div>
        <div>
          <strong>{step.title}</strong>
          <p>{step.detail}</p>
        </div>
      </li>
    {/each}
  </ol>

  <div class="ships-card soft-panel">
    <p class="eyebrow">What Ships In T9</p>
    <ul>
      {#each setupModel.ships as item (item)}
        <li>{item}</li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .setup-stack {
    display: grid;
    gap: 1rem;
  }

  .eyebrow {
    margin: 0 0 0.5rem;
    color: var(--phc-muted);
    font:
      700 0.75rem/1.2 Manrope,
      system-ui,
      sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .resource-card,
  .ships-card {
    padding: 1rem;
  }

  .resource-copy,
  .step-list p {
    margin: 0;
    color: var(--phc-muted);
    font:
      400 0.95rem/1.55 Manrope,
      system-ui,
      sans-serif;
  }

  .resource-links {
    margin: 0.9rem 0 0;
  }

  .step-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.85rem;
  }

  .step-list li {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.85rem;
    padding: 0.9rem 0;
    border-bottom: 0.5px solid var(--phc-border-soft);
  }

  .step-list li:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }

  .step-index {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    background: rgba(233, 195, 73, 0.12);
    border: 0.5px solid rgba(233, 195, 73, 0.18);
    color: var(--phc-label);
    font:
      700 0.9rem/1 Manrope,
      system-ui,
      sans-serif;
  }

  .step-list strong {
    display: block;
    margin-bottom: 0.2rem;
    font:
      600 1rem/1.3 Manrope,
      system-ui,
      sans-serif;
    color: var(--phc-text);
  }

  .ships-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.55rem;
  }

  @media (max-width: 639px) {
    .setup-stack {
      gap: 0.85rem;
    }

    .resource-card,
    .ships-card {
      padding: 0.85rem;
    }

    .resource-links {
      gap: 0.75rem;
      margin-top: 0.75rem;
    }

    .step-list {
      gap: 0.7rem;
    }

    .step-list li {
      gap: 0.7rem;
      padding: 0.75rem 0;
    }

    .step-index {
      width: 1.8rem;
      height: 1.8rem;
      font-size: 0.82rem;
    }

    .step-list strong {
      margin-bottom: 0.15rem;
      font-size: 0.92rem;
    }

    .resource-copy,
    .step-list p {
      font-size: 0.88rem;
      line-height: 1.45;
    }
  }
</style>
