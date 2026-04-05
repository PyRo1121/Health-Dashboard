import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import type { ImportSourceType } from '$lib/core/domain/types';
import { expect } from 'vitest';
import ImportsPage from '../../../../../src/routes/imports/+page.svelte';

export function renderImportsPage() {
  render(ImportsPage);
}

export function getImportSourceSelect(): HTMLSelectElement {
  return screen.getByLabelText('Import source') as HTMLSelectElement;
}

export function getImportPayloadInput(): HTMLTextAreaElement {
  return screen.getByLabelText('Import payload') as HTMLTextAreaElement;
}

export function getPreviewButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Preview import' }) as HTMLButtonElement;
}

export function getCommitButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Commit import' }) as HTMLButtonElement;
}

function createFileList(file: File): FileList {
  if (typeof DataTransfer !== 'undefined') {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    return dataTransfer.files;
  }

  return [file] as unknown as FileList;
}

export async function selectImportSource(sourceType: ImportSourceType) {
  await fireEvent.change(getImportSourceSelect(), {
    target: { value: sourceType },
  });
}

export async function pasteImportPayload(rawText: string) {
  await fireEvent.input(getImportPayloadInput(), {
    target: { value: rawText },
  });
}

export async function uploadImportFile(file: File) {
  await fireEvent.change(screen.getByLabelText('Import file'), {
    target: { files: createFileList(file) },
  });
}

export async function dropImportFile(file: File) {
  await fireEvent.drop(screen.getByLabelText('Import drop zone'), {
    dataTransfer: {
      files: [file],
    },
  });
}

export async function waitForCompanionSummary() {
  await waitFor(() => {
    const summary = screen.getByLabelText('Import payload summary');
    expect(summary).toBeTruthy();
    expect(summary.textContent).toMatch(/Shortcut\/native bundle ready to preview/i);
    expect(getImportSourceSelect().value).toBe('healthkit-companion');
    expect(getPreviewButton()).toHaveProperty('disabled', false);
  });

  return within(screen.getByLabelText('Import payload summary'));
}
