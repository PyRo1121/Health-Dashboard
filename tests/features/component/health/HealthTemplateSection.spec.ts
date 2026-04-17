import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import HealthTemplateSection from '../../../../src/lib/features/health/components/HealthTemplateSection.svelte';
import { createTemplateForm, type HealthMedicationSuggestion } from '$lib/features/health/model';

describe('HealthTemplateSection', () => {
  it('renders medication suggestions and applies a selected suggestion to the template name', async () => {
    const onTemplateFieldChange = vi.fn();

    render(HealthTemplateSection, {
      templateForm: {
        ...createTemplateForm(),
        templateType: 'medication',
      },
      templates: [],
      medicationSuggestions: [
        {
          label: 'Metformin 500 MG Oral Tablet',
          code: '860975',
          referenceUrl:
            'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
          sourceName: 'RxNorm',
        },
      ],
      medicationSuggestionNotice: 'Suggestions from RxNorm.',
      medicationSuggestionMetadata: {
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
      onTemplateFieldChange,
      onSaveTemplate: vi.fn(),
      onQuickLogTemplate: vi.fn(),
      onSearchMedicationSuggestions: vi.fn(),
      onApplyMedicationSuggestion: (suggestion: HealthMedicationSuggestion) =>
        onTemplateFieldChange('label', suggestion),
    });

    expect(screen.getByText(/Suggestions from RxNorm\./i)).toBeTruthy();
    expect(screen.getByText(/Sources: RxNorm/i)).toBeTruthy();
    expect(screen.getByText(/Cache: remote-live/i)).toBeTruthy();
    expect(screen.getByText(/Status: none/i)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Learn more about Metformin 500 MG Oral Tablet' })
    ).toBeTruthy();
    await fireEvent.click(
      screen.getByRole('button', { name: 'Use medication Metformin 500 MG Oral Tablet' })
    );

    expect(onTemplateFieldChange).toHaveBeenCalledWith(
      'label',
      expect.objectContaining({
        label: 'Metformin 500 MG Oral Tablet',
        referenceUrl:
          'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
      })
    );
  });

  it('renders a saved medication template reference link when one exists', () => {
    render(HealthTemplateSection, {
      templateForm: {
        ...createTemplateForm(),
        templateType: 'medication',
      },
      templates: [
        {
          id: 'template-1',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
          label: 'Metformin 500 MG Oral Tablet',
          templateType: 'medication',
          defaultDose: 1,
          defaultUnit: 'tablet',
          referenceUrl:
            'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
        },
      ],
      medicationSuggestions: [],
      medicationSuggestionNotice: '',
      medicationSuggestionMetadata: null,
      onTemplateFieldChange: vi.fn(),
      onSaveTemplate: vi.fn(),
      onQuickLogTemplate: vi.fn(),
      onSearchMedicationSuggestions: vi.fn(),
      onApplyMedicationSuggestion: vi.fn(),
    });

    expect(
      screen.getByRole('link', {
        name: 'Learn more about saved medication Metformin 500 MG Oral Tablet',
      })
    ).toBeTruthy();
  });

  it('renders a saved supplement template reference link without mislabeling it as medication', () => {
    render(HealthTemplateSection, {
      templateForm: {
        ...createTemplateForm(),
        templateType: 'supplement',
      },
      templates: [
        {
          id: 'template-2',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
          label: 'Vitamin D3',
          templateType: 'supplement',
          defaultDose: 1,
          defaultUnit: 'softgel',
          referenceUrl: 'https://example.com/vitamin-d3',
        },
      ],
      medicationSuggestions: [],
      medicationSuggestionNotice: '',
      medicationSuggestionMetadata: null,
      onTemplateFieldChange: vi.fn(),
      onSaveTemplate: vi.fn(),
      onQuickLogTemplate: vi.fn(),
      onSearchMedicationSuggestions: vi.fn(),
      onApplyMedicationSuggestion: vi.fn(),
    });

    expect(
      screen.getByRole('link', { name: 'Learn more about saved supplement Vitamin D3' })
    ).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: 'Learn more about saved medication Vitamin D3' })
    ).toBeNull();
  });

  it('does not render unsafe medication suggestion or saved-template links', () => {
    render(HealthTemplateSection, {
      templateForm: {
        ...createTemplateForm(),
        templateType: 'medication',
      },
      templates: [
        {
          id: 'template-3',
          createdAt: '2026-04-17T00:00:00.000Z',
          updatedAt: '2026-04-17T00:00:00.000Z',
          label: 'Unsafe Supplement',
          templateType: 'supplement',
          referenceUrl: 'javascript:alert(1)',
        },
      ],
      medicationSuggestions: [
        {
          label: 'Unsafe Med',
          code: '1',
          referenceUrl: 'javascript:alert(1)',
          sourceName: 'RxNorm',
        },
      ],
      medicationSuggestionNotice: 'Suggestions from RxNorm.',
      medicationSuggestionMetadata: null,
      onTemplateFieldChange: vi.fn(),
      onSaveTemplate: vi.fn(),
      onQuickLogTemplate: vi.fn(),
      onSearchMedicationSuggestions: vi.fn(),
      onApplyMedicationSuggestion: vi.fn(),
    });

    expect(screen.queryByRole('link', { name: 'Learn more about Unsafe Med' })).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'Learn more about saved supplement Unsafe Supplement' })
    ).toBeNull();
  });
});
