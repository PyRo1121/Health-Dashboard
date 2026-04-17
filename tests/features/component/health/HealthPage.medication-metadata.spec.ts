import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Health route medication suggestion metadata', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/health/client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('clears medication suggestion notice and metadata after applying a suggested medication', async () => {
    vi.doMock('$lib/features/health/client', async () => {
      const actual =
        await vi.importActual<typeof import('../../../../src/lib/features/health/client')>(
          '$lib/features/health/client'
        );

      return {
        ...actual,
        loadHealthPage: vi.fn(async () => ({
          ...actual.createHealthPageState(),
          loading: false,
          localDay: '2026-04-17',
          snapshot: { sleepEvent: null, events: [], templates: [] },
        })),
        searchHealthMedicationSuggestions: vi.fn(async () => ({
          suggestions: [
            {
              label: 'Metformin 500 MG Oral Tablet',
              code: '860975',
              sourceName: 'RxNorm',
            },
          ],
          notice: 'Server-owned medication guidance.',
          metadata: {
            provenance: [
              {
                sourceId: 'rxnorm',
                sourceName: 'RxNorm',
                category: 'reference',
                productionPosture: 'adopt',
              },
            ],
            cacheStatus: 'remote-live',
            degradationStatus: 'none',
          },
        })),
        saveSymptomPage: vi.fn(),
        saveAnxietyPage: vi.fn(),
        saveSleepNotePage: vi.fn(),
        saveTemplatePage: vi.fn(),
        quickLogTemplatePage: vi.fn(),
      };
    });

    const { default: HealthPage } = await import('../../../../src/routes/health/+page.svelte');
    render(HealthPage);

    await screen.findByLabelText('Template name');
    await fireEvent.change(screen.getByLabelText('Template type'), {
      target: { value: 'medication' },
    });
    await fireEvent.input(screen.getByLabelText('Template name'), {
      target: { value: 'Metformin' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Suggest medications' }));

    expect(await screen.findByText('Server-owned medication guidance.')).toBeTruthy();
    expect(screen.getByText(/Sources: RxNorm/i)).toBeTruthy();

    await fireEvent.click(
      screen.getByRole('button', { name: 'Use medication Metformin 500 MG Oral Tablet' })
    );

    expect(screen.queryByText('Server-owned medication guidance.')).toBeNull();
    expect(screen.queryByText(/Sources: RxNorm/i)).toBeNull();
  });

});
