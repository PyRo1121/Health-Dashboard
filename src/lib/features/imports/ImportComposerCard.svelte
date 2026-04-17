<script lang="ts">
  import { resolve } from '$app/paths';
  import type { ImportPreviewResult, ImportSourceType } from '$lib/core/domain/types';
  import type { DeviceSourceManifest } from '$lib/features/integrations/manifests/device-sources';
  import { Button, Field, SectionCard, StatusBanner } from '$lib/core/ui/primitives';
  import ImportPayloadSummaryCard from './ImportPayloadSummaryCard.svelte';
  import type { ImportSourceConfig } from './source-config';
  import type { ImportPayloadSummary } from './core';
  import type { ImportSourceHelperCopy } from '$lib/features/integrations/setup-presenters';

  type SampleBundle = NonNullable<ImportSourceConfig['sampleBundle']>;

  interface Props {
    sourceType: ImportSourceType;
    importSourceOptions: Array<{ value: ImportSourceType; label: string }>;
    currentSourceConfig: ImportSourceConfig;
    payload: string;
    payloadOrigin?: 'manual' | 'file' | 'sample';
    files?: FileList;
    isDragActive?: boolean;
    selectedFileName?: string;
    payloadSummary?: ImportPayloadSummary | null;
    healthkitManifest: DeviceSourceManifest;
    sourceLabels: Record<ImportSourceType, string>;
    currentHelperCopy?: ImportSourceHelperCopy;
    showHelperLinks?: boolean;
    currentSampleBundle?: SampleBundle | null;
    canPreviewPayload?: boolean;
    latestPreview?: ImportPreviewResult | null;
    saveNotice?: string;
    fileNotice?: string;
    errorNotice?: string;
    onSourceChange?: (event: Event) => void;
    onPayloadInput?: (event: Event) => void;
    onFileSelection?: (event: Event) => void;
    onDragEnter?: (event: DragEvent) => void;
    onDragOver?: (event: DragEvent) => void;
    onDragLeave?: (event: DragEvent) => void;
    onDrop?: (event: DragEvent) => void;
    onLoadSampleBundle?: () => void;
    onClearLoadedFile?: () => void;
    onPreview?: () => void | Promise<void>;
    onCommit?: () => void | Promise<void>;
  }

  let {
    sourceType,
    importSourceOptions,
    currentSourceConfig,
    payload,
    payloadOrigin = 'manual',
    files = $bindable<FileList | undefined>(undefined),
    isDragActive = false,
    selectedFileName = '',
    payloadSummary = null,
    healthkitManifest,
    sourceLabels,
    currentHelperCopy,
    showHelperLinks = false,
    currentSampleBundle = null,
    canPreviewPayload = false,
    latestPreview = null,
    saveNotice = '',
    fileNotice = '',
    errorNotice = '',
    onSourceChange,
    onPayloadInput,
    onFileSelection,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    onLoadSampleBundle,
    onClearLoadedFile,
    onPreview,
    onCommit,
  }: Props = $props();
</script>

<SectionCard title="Preview import" intro={currentSourceConfig.description}>
  <Field label="Import source">
    <select value={sourceType} aria-label="Import source" onchange={onSourceChange}>
      {#each importSourceOptions as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </Field>
  <Field
    className="spaced-field"
    label="Paste raw payload instead"
    hint="File upload is the preferred path. Raw paste is the fallback for copied JSON or XML."
  >
    <textarea
      bind:value={payload}
      aria-label="Import payload"
      rows="10"
      placeholder="Paste iPhone companion JSON, SMART sandbox FHIR JSON, Apple Health XML, or Day One JSON here."
      oninput={onPayloadInput}
    ></textarea>
  </Field>
  <Field className="spaced-field" label="Import file">
    <div class="file-field-stack">
      <div
        class:drop-zone--active={isDragActive}
        class="drop-zone"
        aria-label="Import drop zone"
        role="group"
        ondragenter={onDragEnter}
        ondragover={onDragOver}
        ondragleave={onDragLeave}
        ondrop={onDrop}
      >
        <strong>Drop Shortcut JSON or XML here</strong>
        <p class="status-copy">
          Choose a file or drag it into this surface. The app will infer the source when it can.
        </p>
        {#if payloadOrigin !== 'manual' && selectedFileName}
          <p class="file-pill">{selectedFileName}</p>
        {/if}
      </div>
      <input
        type="file"
        accept=".json,.xml,text/xml,application/json"
        aria-label="Import file"
        bind:files
        onchange={onFileSelection}
      />
    </div>
  </Field>

  {#if payloadSummary}
    <ImportPayloadSummaryCard
      summary={payloadSummary}
      manifest={healthkitManifest}
      {sourceLabels}
    />
  {/if}

  {#if currentSourceConfig.sourceMetadata}
    <div class="source-metadata soft-panel">
      <p class="status-copy">Source: {currentSourceConfig.sourceMetadata.sourceName}</p>
      <p class="status-copy">Trust: {currentSourceConfig.sourceMetadata.reliability}</p>
      <p class="status-copy">Auth: {currentSourceConfig.sourceMetadata.authMode}</p>
    </div>
  {/if}

  {#if currentHelperCopy}
    <div class="helper-copy soft-panel">
      <p><strong>{currentHelperCopy.title}</strong></p>
      <p class="status-copy helper-line">
        {currentHelperCopy.description}
      </p>
      {#if showHelperLinks}
        <p class="helper-links link-row">
          {#each currentHelperCopy.links ?? [] as link (link.label)}
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
      {/if}
      {#if currentHelperCopy.bullets}
        <ul>
          {#each currentHelperCopy.bullets ?? [] as bullet (bullet)}
            <li>{bullet}</li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  <div class="button-row">
    {#if currentSampleBundle}
      <Button variant="ghost" onclick={onLoadSampleBundle}>Load sample bundle</Button>
    {/if}
    {#if payloadOrigin !== 'manual' && selectedFileName}
      <Button variant="ghost" onclick={onClearLoadedFile}>Clear loaded file</Button>
    {/if}
    <Button variant="secondary" onclick={onPreview} disabled={!canPreviewPayload}>
      Preview import
    </Button>
    <Button onclick={onCommit} disabled={!latestPreview}>
      Commit import
    </Button>
  </div>

  {#if latestPreview}
    <div class="preview-summary">
      <p>Adds: {latestPreview.summary?.adds ?? 0}</p>
      <p>Duplicates: {latestPreview.summary?.duplicates ?? 0}</p>
      <p>Warnings: {latestPreview.summary?.warnings ?? 0}</p>
    </div>
  {/if}

  {#if saveNotice}
    <StatusBanner tone="neutral" title="Import committed" message={saveNotice} />
  {/if}

  {#if fileNotice}
    <StatusBanner tone="neutral" title="File loaded" message={fileNotice} />
  {/if}

  {#if errorNotice}
    <StatusBanner tone="warning" title="Import validation failed" message={errorNotice} />
  {/if}
</SectionCard>

<style>
  .file-field-stack {
    display: grid;
    gap: 0.75rem;
  }

  .helper-copy {
    margin: 0 0 1rem;
  }

  .source-metadata {
    margin: 0 0 1rem;
  }

  .helper-copy p,
  .source-metadata p,
  .helper-copy ul {
    margin: 0;
  }

  .helper-copy ul {
    padding-left: 1.2rem;
    margin-top: 0.5rem;
  }

  .helper-line {
    margin-top: 0.5rem;
  }

  .helper-links {
    margin-top: 0.75rem;
  }

  .drop-zone {
    display: grid;
    gap: 0.45rem;
    padding: 1rem;
    border: 1px dashed rgba(233, 195, 73, 0.28);
    background: rgba(10, 60, 45, 0.16);
  }

  .drop-zone--active {
    border-color: var(--phc-label);
    background: rgba(233, 195, 73, 0.08);
  }

  .drop-zone strong {
    font:
      600 0.98rem/1.2 Manrope,
      system-ui,
      sans-serif;
  }

  .file-pill {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 0.35rem 0.7rem;
    border: 0.5px solid rgba(233, 195, 73, 0.18);
    background: rgba(233, 195, 73, 0.12);
    color: var(--phc-label);
    font:
      600 0.85rem/1.2 Manrope,
      system-ui,
      sans-serif;
  }

  .preview-summary {
    margin-top: 1rem;
  }

  @media (max-width: 639px) {
    .file-field-stack {
      gap: 0.6rem;
    }

    .helper-copy {
      margin-bottom: 0.8rem;
    }

    .helper-links {
      gap: 0.75rem;
      margin-top: 0.6rem;
    }

    .drop-zone {
      padding: 0.85rem;
    }

    .preview-summary {
      margin-top: 0.8rem;
    }
  }
</style>
