import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import SobrietyPage from '../../../../src/routes/sobriety/+page.svelte';
import { expectHeading, resetRouteDb, waitForText } from '../../../support/component/routeHarness';

describe('Sobriety route', () => {
  beforeEach(async () => {
    await resetRouteDb();
  });

  it('renders the empty state and streak summary', async () => {
    render(SobrietyPage);
    expectHeading('Sobriety');
    await waitForText(/No sobriety events logged for today/i);
  });

  it('logs sober status, craving, and lapse context', async () => {
    render(SobrietyPage);

    await screen.findByRole('button', { name: 'Mark sober today' });
    await fireEvent.click(screen.getByRole('button', { name: 'Mark sober today' }));
    await fireEvent.input(screen.getByLabelText('Craving score'), { target: { value: '4' } });
    await fireEvent.input(screen.getByLabelText('Craving note'), {
      target: { value: 'Stress spike after lunch.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Log craving' }));

    await fireEvent.input(screen.getByLabelText('Lapse note'), {
      target: { value: 'Had a lapse after a rough evening.' },
    });
    await fireEvent.input(screen.getByLabelText('Recovery action'), {
      target: { value: 'Text sponsor' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Log lapse context' }));

    await waitFor(() => {
      expect(screen.getByText(/Current streak: 1 day/i)).toBeTruthy();
      expect(screen.getByText(/Stress spike after lunch/i)).toBeTruthy();
      expect(screen.getByText(/Lapse context logged\./i)).toBeTruthy();
    });
  });
});
