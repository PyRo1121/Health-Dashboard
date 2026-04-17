import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { getTestHealthDb } from '$lib/core/db/test-client';
import HealthPage from '../../../../src/routes/health/+page.svelte';
import { expectHeading, resetRouteDb } from '../../../support/component/routeHarness';

describe('Health route', () => {
  beforeEach(async () => {
    await resetRouteDb();
  });

  it('renders the health loop shell and empty states', async () => {
    render(HealthPage);

    expectHeading('Health');
    await waitFor(() => {
      expect(screen.getByText(/No imported sleep yet/i)).toBeTruthy();
      expect(screen.getByText(/No templates saved yet/i)).toBeTruthy();
      expect(screen.getByText(/No health events logged yet/i)).toBeTruthy();
    });
  });

  it('logs symptom, anxiety, sleep context, and a reusable supplement template', async () => {
    render(HealthPage);

    await screen.findByLabelText('Symptom');
    await fireEvent.input(screen.getByLabelText('Symptom'), { target: { value: 'Headache' } });
    await fireEvent.input(screen.getByLabelText('Symptom severity'), { target: { value: '4' } });
    await fireEvent.input(screen.getByLabelText('Symptom note'), {
      target: { value: 'After lunch' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Log symptom' }));

    await fireEvent.input(screen.getByLabelText('Anxiety intensity'), { target: { value: '4' } });
    await fireEvent.input(screen.getByLabelText('Anxiety trigger'), {
      target: { value: 'Crowded store' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Log anxiety' }));

    await fireEvent.input(screen.getByLabelText('Sleep note'), {
      target: { value: 'Woke up twice' },
    });
    await fireEvent.input(screen.getByLabelText('Sleep restfulness'), { target: { value: '2' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Log sleep note' }));

    await fireEvent.input(screen.getByLabelText('Template name'), {
      target: { value: 'Magnesium glycinate' },
    });
    await fireEvent.input(screen.getByLabelText('Default dose'), { target: { value: '2' } });
    await fireEvent.input(screen.getByLabelText('Default unit'), { target: { value: 'capsules' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save template' }));

    await waitFor(() => {
      expect(screen.getByText(/Template saved\./i)).toBeTruthy();
      expect(screen.getByText('Magnesium glycinate')).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Log now' }));

    await waitFor(() => {
      const healthStream = screen
        .getByRole('heading', { name: 'Today’s health stream' })
        .closest('section');
      expect(healthStream).toBeTruthy();
      expect(screen.getByText(/Template logged\./i)).toBeTruthy();
      expect(within(healthStream as HTMLElement).getByText('Headache')).toBeTruthy();
      expect(
        within(healthStream as HTMLElement).getByText('Anxiety episode', { exact: true })
      ).toBeTruthy();
      expect(
        within(healthStream as HTMLElement).getByText('Sleep note', { exact: true })
      ).toBeTruthy();
      expect(within(healthStream as HTMLElement).getByText('Magnesium glycinate')).toBeTruthy();
    });
  });

  it('surfaces a saved medication template reference link after quick logging it', async () => {
    await getTestHealthDb().healthTemplates.put({
      id: 'template-med-1',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
      label: 'Metformin 500 MG Oral Tablet',
      templateType: 'medication',
      defaultDose: 1,
      defaultUnit: 'tablet',
      note: 'With breakfast',
      referenceUrl:
        'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
    });

    render(HealthPage);

    await waitFor(() => {
      expect(screen.getByText('Metformin 500 MG Oral Tablet')).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Log now' }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Learn more about logged medication Metformin 500 MG Oral Tablet' })).toBeTruthy();
    });
  });
});
