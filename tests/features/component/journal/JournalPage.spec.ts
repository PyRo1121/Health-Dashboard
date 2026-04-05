import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import JournalPage from '../../../../src/routes/journal/+page.svelte';
import { expectHeading, resetRouteDb, waitForText } from '../../../support/component/routeHarness';

describe('Journal route', () => {
  beforeEach(async () => {
    await resetRouteDb();
  });

  it('renders the writing surface and empty state', async () => {
    render(JournalPage);

    expectHeading('Journal');
    await waitForText(/Nothing written yet today/i);
  });

  it('creates a journal entry and lists it', async () => {
    render(JournalPage);

    await screen.findByLabelText('Title');
    await fireEvent.input(screen.getByLabelText('Title'), {
      target: { value: 'Morning check-in' },
    });
    await fireEvent.input(screen.getByLabelText('Body'), {
      target: { value: 'Woke up steady and ready to work.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save entry' }));

    await waitFor(() => {
      expect(screen.getByText('Morning check-in')).toBeTruthy();
      expect(screen.getByText(/steady and ready to work/i)).toBeTruthy();
    });
  });
});
