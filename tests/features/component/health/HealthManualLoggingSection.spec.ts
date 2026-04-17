import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import HealthManualLoggingSection from '../../../../src/lib/features/health/components/HealthManualLoggingSection.svelte';
import {
  createAnxietyForm,
  createSleepNoteForm,
  createSymptomForm,
  type HealthSymptomSuggestion,
} from '$lib/features/health/model';

describe('HealthManualLoggingSection', () => {
  it('renders symptom suggestions and applies a selected suggestion to the symptom field', async () => {
    const onSymptomFieldChange = vi.fn();

    render(HealthManualLoggingSection, {
      symptomForm: createSymptomForm(),
      anxietyForm: createAnxietyForm(),
      sleepNoteForm: createSleepNoteForm(),
      symptomSuggestions: [
        {
          label: 'Headache',
          code: 'R51',
          referenceUrl:
            'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
          sourceName: 'Clinical Tables Conditions',
        },
        { label: 'Headache disorder', code: 'R51.9', sourceName: 'Clinical Tables Conditions' },
      ],
      symptomSuggestionNotice: 'Suggestions from Clinical Tables Conditions.',
      symptomSuggestionMetadata: {
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
      onSymptomFieldChange,
      onAnxietyFieldChange: vi.fn(),
      onSleepNoteFieldChange: vi.fn(),
      onSaveSymptom: vi.fn(),
      onSaveAnxiety: vi.fn(),
      onSaveSleepNote: vi.fn(),
      onSearchSymptomSuggestions: vi.fn(),
      onApplySymptomSuggestion: (suggestion: HealthSymptomSuggestion) =>
        onSymptomFieldChange('symptom', suggestion.label),
    });

    expect(screen.getByText(/Suggestions from Clinical Tables Conditions\./i)).toBeTruthy();
    expect(screen.getByText(/Sources: Clinical Tables Conditions/i)).toBeTruthy();
    expect(screen.getByText(/Cache: remote-live/i)).toBeTruthy();
    expect(screen.getByText(/Status: none/i)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Learn more about Headache' }).getAttribute('href')
    ).toBe(
      'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en'
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Use symptom Headache' }));

    expect(onSymptomFieldChange).toHaveBeenCalledWith('symptom', 'Headache');
  });

  it('does not render unsafe suggestion links', () => {
    render(HealthManualLoggingSection, {
      symptomForm: createSymptomForm(),
      anxietyForm: createAnxietyForm(),
      sleepNoteForm: createSleepNoteForm(),
      symptomSuggestions: [
        {
          label: 'Headache',
          code: 'R51',
          referenceUrl: 'javascript:alert(1)',
          sourceName: 'Clinical Tables Conditions',
        },
      ],
      symptomSuggestionNotice: 'Suggestions from Clinical Tables Conditions.',
      symptomSuggestionMetadata: null,
      onSymptomFieldChange: vi.fn(),
      onAnxietyFieldChange: vi.fn(),
      onSleepNoteFieldChange: vi.fn(),
      onSaveSymptom: vi.fn(),
      onSaveAnxiety: vi.fn(),
      onSaveSleepNote: vi.fn(),
      onSearchSymptomSuggestions: vi.fn(),
      onApplySymptomSuggestion: vi.fn(),
    });

    expect(screen.queryByRole('link', { name: 'Learn more about Headache' })).toBeNull();
  });
});
