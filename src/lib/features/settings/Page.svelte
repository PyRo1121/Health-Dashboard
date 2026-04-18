<script lang="ts">
  import { browser } from '$app/environment';
  import { Button, Card, Field, SectionCard, StatusBanner } from '$lib/core/ui/primitives';
  import {
    clearSettingsPage,
    createSettingsPageState,
    loadSettingsPage,
    saveSettingsPage,
  } from '$lib/features/settings/controller';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import {
    canSaveOwnerProfileForm,
    settingsLocalFirstPostureItems,
    settingsOwnerProfileDescription,
  } from '$lib/features/settings/model';
  import NoMacSetupChecklist from '$lib/features/integrations/NoMacSetupChecklist.svelte';
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
  import { DEVICE_SOURCE_MANIFESTS } from '$lib/features/integrations/manifests/device-sources';

  const healthkitManifest = DEVICE_SOURCE_MANIFESTS[0];
  let page = $state(createSettingsPageState());

  async function postSettingsAction(body: object): Promise<Response | null> {
    if (!browser) {
      return null;
    }

    try {
      return await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch {
      return null;
    }
  }

  async function loadOwnerProfile() {
    page = loadSettingsPage();
    const response = await postSettingsAction({ action: 'load' });
    if (!response?.ok) {
      return;
    }

    const data = (await response.json()) as {
      profile: { fullName: string; birthDate: string } | null;
    };

    if (!data.profile) {
      return;
    }

    page = createSettingsPageState();
    page.fullName = data.profile.fullName;
    page.birthDate = data.profile.birthDate;
  }

  let canSaveOwnerProfile = $derived(canSaveOwnerProfileForm(page.fullName, page.birthDate));

  async function handleSaveOwnerProfile() {
    page = saveSettingsPage({
      fullName: page.fullName,
      birthDate: page.birthDate,
    });

    await postSettingsAction({
      action: 'saveOwnerProfile',
      profile: {
        fullName: page.fullName,
        birthDate: page.birthDate,
      },
    });
  }

  async function handleClearOwnerProfile() {
    page = clearSettingsPage();
    await postSettingsAction({ action: 'clearOwnerProfile' });
  }

  onBrowserRouteMount(loadOwnerProfile);
</script>

<RoutePageHeader href="/settings" />

<div class="page-grid settings-grid">
  <div class="settings-panel settings-panel--setup">
    <Card>
      <h2 class="card-title">iPhone setup</h2>
      <NoMacSetupChecklist manifest={healthkitManifest} showNavigationLinks={false} />
    </Card>
  </div>

  <div class="settings-panel settings-panel--profile">
    <SectionCard title="Clinical owner profile" intro={settingsOwnerProfileDescription}>
      <Field className="field-block" label="Owner full name">
        <input bind:value={page.fullName} aria-label="Owner full name" placeholder="Pyro Example" />
      </Field>

      <Field className="field-block" label="Owner birth date">
        <input bind:value={page.birthDate} aria-label="Owner birth date" type="date" />
      </Field>

      <div class="button-row">
        <Button onclick={handleSaveOwnerProfile} disabled={!canSaveOwnerProfile}>
          Save owner profile
        </Button>
        <Button variant="ghost" onclick={handleClearOwnerProfile}>Clear owner profile</Button>
      </div>

      {#if page.statusMessage}
        <StatusBanner tone="neutral" title="Owner profile" message={page.statusMessage} />
      {/if}
    </SectionCard>
  </div>

  <div class="settings-panel settings-panel--posture">
    <SectionCard title="Local-first posture">
      <p class="status-copy">
        Every external feed is staged before commit. No device or portal source writes directly into
        feature-specific tables.
      </p>
      <ul class="summary-list">
        {#each settingsLocalFirstPostureItems as item (item)}
          <li>{item}</li>
        {/each}
      </ul>
    </SectionCard>
  </div>
</div>

<style>
  .summary-list {
    display: grid;
    gap: 0.65rem;
    color: var(--phc-muted);
    font: 400 0.95rem/1.5 var(--phc-font-ui);
  }

  .summary-list li {
    padding-bottom: 0.65rem;
    border-bottom: 0.5px solid var(--phc-border-soft);
  }

  .summary-list li:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .button-row {
    margin-top: 1rem;
  }

  @media (max-width: 639px) {
    .settings-grid {
      gap: 0.9rem;
    }

    .settings-panel--setup {
      order: 2;
    }

    .settings-panel--profile {
      order: 1;
    }

    .settings-panel--posture {
      order: 3;
    }
  }

  @media (min-width: 960px) {
    .settings-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      align-items: start;
    }
  }
</style>
