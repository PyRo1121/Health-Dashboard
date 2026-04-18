import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Health route symptom suggestion metadata', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/health/client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('clears symptom suggestion notice and metadata after logging the selected symptom', async () => {
    vi.doMock('$lib/features/health/client', async () => {
      const actual = await vi.importActual<
        typeof import('../../../../src/lib/features/health/client')
      >('$lib/features/health/client');
      const saveSymptomPage = vi.fn(async (state) => ({
        ...state,
        loading: false,
        snapshot: { sleepEvent: null, events: [], templates: [] },
        saveNotice: 'Symptom logged.',
        symptomForm: actual.createHealthPageState().symptomForm,
      }));

      return {
        ...actual,
        loadHealthPage: vi.fn(async () => ({
          ...actual.createHealthPageState(),
          loading: false,
          localDay: '2026-04-17',
          snapshot: { sleepEvent: null, events: [], templates: [] },
        })),
        searchHealthSymptomSuggestions: vi.fn(async () => ({
          suggestions: [
            { label: 'Headache', code: 'R51', sourceName: 'Clinical Tables Conditions' },
          ],
          notice: 'Server-owned symptom guidance.',
          metadata: {
            provenance: [
              {
                sourceId: 'clinical-tables-conditions',
                sourceName: 'Clinical Tables Conditions',
                category: 'reference',
                productionPosture: 'adopt',
              },
            ],
            cacheStatus: 'remote-live',
            degradationStatus: 'none',
          },
        })),
        saveSymptomPage,
        saveAnxietyPage: vi.fn(),
        saveSleepNotePage: vi.fn(),
        saveTemplatePage: vi.fn(),
        quickLogTemplatePage: vi.fn(),
      };
    });

    const { default: HealthPage } = await import('../../../../src/routes/health/+page.svelte');
    render(HealthPage);

    await screen.findByLabelText('Symptom');
    await fireEvent.input(screen.getByLabelText('Symptom'), { target: { value: 'Head' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Suggest symptoms' }));

    expect(await screen.findByText('Server-owned symptom guidance.')).toBeTruthy();
    expect(screen.getByText(/Sources: Clinical Tables Conditions/i)).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Use symptom Headache' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Log symptom' }));

    expect(screen.queryByText('Server-owned symptom guidance.')).toBeNull();
    expect(screen.queryByText(/Sources: Clinical Tables Conditions/i)).toBeNull();
  });
});
