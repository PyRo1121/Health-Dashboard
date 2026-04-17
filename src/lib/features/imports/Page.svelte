<script lang="ts">
  import type { ImportBatch, ImportPreviewResult, ImportSourceType } from '$lib/core/domain/types';
  import { DEVICE_SOURCE_MANIFESTS } from '$lib/features/integrations/manifests/device-sources';
  import { createSampleHealthKitBundle } from '$lib/features/integrations/connectors/healthkit';
  import { createSampleSmartFhirBundle } from '$lib/features/integrations/connectors/smart-fhir';
  import ImportBatchHistoryCard from '$lib/features/imports/ImportBatchHistoryCard.svelte';
  import ImportComposerCard from '$lib/features/imports/ImportComposerCard.svelte';
  import {
    allowsHelperLinks,
    canPreviewImportPayload,
    queuedImportFile,
    type ImportIntakeState,
  } from '$lib/features/imports/intake-state';
  import {
    commitImportsPage,
    loadImportsFilePayload,
    previewImportsPage,
    refreshImportsPage,
  } from '$lib/features/imports/page-actions';
  import {
    applyImportsManualPayloadEdit,
    clearImportsLoadedPayload,
    createImportsPageState,
    finalizeImportsManualPayload,
    loadImportsSamplePayload,
    setImportsPageDragState,
    setImportsPageSourceType,
    type ImportsPageState,
  } from '$lib/features/imports/page-state';
  import {
    buildImportSourceCatalog,
    isSampleBundleSourceType,
  } from '$lib/features/imports/source-config';
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import { getOwnerProfile } from '$lib/features/settings/service';
  import { describeImportPayload } from '$lib/features/imports/analyze';
  import {
    commitImportBatchClient,
    listImportBatchesClient,
    previewImportClient,
  } from '$lib/features/imports/client';

  const initialPageState = createImportsPageState('healthkit-companion');

  let loading = $state(initialPageState.loading);
  let sourceType = $state<ImportSourceType>(initialPageState.intake.sourceType);
  let payload = $state(initialPageState.intake.payload);
  let payloadOrigin = $state(initialPageState.intake.payloadOrigin);
  let selectedFileName = $state(initialPageState.intake.selectedFileName);
  let fileNotice = $state(initialPageState.intake.fileNotice);
  let payloadSummary = $state(initialPageState.intake.payloadSummary);
  let isManualAnalysisPending = $state(initialPageState.intake.isManualAnalysisPending);
  let latestPreview = $state<ImportPreviewResult | null>(initialPageState.intake.latestPreview);
  let saveNotice = $state(initialPageState.intake.saveNotice);
  let errorNotice = $state(initialPageState.intake.errorNotice);
  let batches = $state<ImportBatch[]>(initialPageState.batches);
  let files = $state<FileList | undefined>();
  let isDragActive = $state(initialPageState.isDragActive);
  let mounted = true;

  const healthkitManifest = DEVICE_SOURCE_MANIFESTS[0];
  const importSourceCatalog = buildImportSourceCatalog({
    healthkitManifest,
    createSampleHealthKitBundle,
    createSampleSmartFhirBundle,
  });
  const {
    config: importSourceConfig,
    options: importSourceOptions,
    labels: sourceLabels,
  } = importSourceCatalog;
  let currentSourceConfig = $derived(importSourceConfig[sourceType]);
  let currentHelperCopy = $derived(currentSourceConfig.helper);
  let currentSampleBundle = $derived.by(() => {
    if (!isSampleBundleSourceType(sourceType)) return null;
    return importSourceConfig[sourceType].sampleBundle ?? null;
  });
  let showHelperLinks = $derived(
    Boolean(currentHelperCopy?.links && allowsHelperLinks(payloadSummary))
  );
  let canPreviewPayload = $derived(
    canPreviewImportPayload({ payload, isManualAnalysisPending, payloadSummary })
  );

  function readIntake(): ImportIntakeState {
    return {
      sourceType,
      payload,
      payloadOrigin,
      selectedFileName,
      fileNotice,
      payloadSummary,
      isManualAnalysisPending,
      latestPreview,
      saveNotice,
      errorNotice,
    };
  }

  function writeIntake(next: ImportIntakeState): void {
    sourceType = next.sourceType;
    payload = next.payload;
    payloadOrigin = next.payloadOrigin;
    selectedFileName = next.selectedFileName;
    fileNotice = next.fileNotice;
    payloadSummary = next.payloadSummary;
    isManualAnalysisPending = next.isManualAnalysisPending;
    latestPreview = next.latestPreview;
    saveNotice = next.saveNotice;
    errorNotice = next.errorNotice;
  }

  function readPageState(): ImportsPageState {
    return {
      loading,
      batches,
      intake: readIntake(),
      isDragActive,
    };
  }

  function writePageState(next: ImportsPageState): void {
    loading = next.loading;
    batches = next.batches;
    isDragActive = next.isDragActive;
    writeIntake(next.intake);
  }

  async function refreshBatches() {
    if (!mounted) return;

    const nextState = await refreshImportsPage(readPageState(), listImportBatchesClient);

    if (!mounted) return;
    writePageState(nextState);
  }

  async function runPreview() {
    const nextState = await previewImportsPage(readPageState(), {
      getOwnerProfile,
      previewImport: previewImportClient,
    });

    writePageState(nextState);
  }

  async function commitPreview() {
    const nextState = await commitImportsPage(readPageState(), {
      getOwnerProfile,
      commitImportBatch: commitImportBatchClient,
    });

    writePageState(nextState);
  }

  function loadSampleBundle() {
    const sample = currentSampleBundle;
    if (!sample) return;
    writePageState(loadImportsSamplePayload(readPageState(), sample, describeImportPayload));
  }

  async function loadImportFile(file: File) {
    if (!file) return;
    writePageState(await loadImportsFilePayload(readPageState(), file, describeImportPayload));
  }

  async function handleFileSelection(event: Event) {
    const file = (event.currentTarget as HTMLInputElement | null)?.files?.[0];
    if (!file) return;
    await loadImportFile(file);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    writePageState(setImportsPageDragState(readPageState(), true));
  }

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    writePageState(setImportsPageDragState(readPageState(), true));
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    writePageState(setImportsPageDragState(readPageState(), false));
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    writePageState(setImportsPageDragState(readPageState(), false));

    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await loadImportFile(file);
  }

  function clearLoadedFile() {
    files = typeof DataTransfer === 'undefined' ? undefined : new DataTransfer().files;
    writePageState(clearImportsLoadedPayload(readPageState()));
  }

  function handleSourceChange(event: Event) {
    writePageState(
      setImportsPageSourceType(
        readPageState(),
        (event.currentTarget as HTMLSelectElement).value as ImportSourceType
      )
    );
  }

  function handlePayloadInput(event: Event) {
    const nextValue = (event.currentTarget as HTMLTextAreaElement | null)?.value ?? '';
    files = typeof DataTransfer === 'undefined' ? undefined : new DataTransfer().files;
    writePageState(applyImportsManualPayloadEdit(readPageState(), nextValue));
  }

  $effect(() => {
    if (payloadOrigin !== 'manual') return;
    if (!isManualAnalysisPending) return;
    if (!payload.trim()) return;

    const payloadSnapshot = payload;
    const timer = setTimeout(() => {
      if (payload !== payloadSnapshot || payloadOrigin !== 'manual') return;
      writePageState(
        finalizeImportsManualPayload(readPageState(), describeImportPayload(payloadSnapshot))
      );
    }, 180);

    return () => clearTimeout(timer);
  });

  $effect(() => {
    const file = queuedImportFile(files);
    if (!file) return;

    void loadImportFile(file).finally(() => {
      files = typeof DataTransfer === 'undefined' ? undefined : new DataTransfer().files;
    });
  });

  onBrowserRouteMount(refreshBatches);
  onBrowserRouteMount(() => {
    return () => {
      mounted = false;
    };
  });
</script>

<RoutePageHeader href="/imports" />

{#if loading}
  <p class="status-copy">Loading import center…</p>
{:else}
  <div class="page-grid imports-grid">
    <ImportComposerCard
      {sourceType}
      {importSourceOptions}
      {currentSourceConfig}
      {payload}
      {payloadOrigin}
      bind:files
      {isDragActive}
      {selectedFileName}
      {payloadSummary}
      {healthkitManifest}
      {sourceLabels}
      {currentHelperCopy}
      {showHelperLinks}
      {currentSampleBundle}
      {canPreviewPayload}
      {latestPreview}
      {saveNotice}
      {fileNotice}
      {errorNotice}
      onSourceChange={handleSourceChange}
      onPayloadInput={handlePayloadInput}
      onFileSelection={handleFileSelection}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onLoadSampleBundle={loadSampleBundle}
      onClearLoadedFile={clearLoadedFile}
      onPreview={runPreview}
      onCommit={commitPreview}
    />

    <ImportBatchHistoryCard {batches} />
  </div>
{/if}

<style>
  @media (min-width: 960px) {
    .imports-grid {
      grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr);
    }
  }
</style>
