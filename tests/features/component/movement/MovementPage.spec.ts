import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { getTestHealthDb } from '$lib/core/db/test-client';
import MovementPage from '../../../../src/routes/movement/+page.svelte';
import { expectHeading, resetRouteDb } from '../../../support/component/routeHarness';

describe('Movement route', () => {
  beforeEach(async () => {
    await resetRouteDb();
  });

  it('renders the exercise picker and saves a workout template card', async () => {
    await getTestHealthDb().exerciseCatalogItems.put({
      id: 'wger:1',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      sourceType: 'wger',
      externalId: '1',
      title: 'Goblet squat',
      muscleGroups: ['Quadriceps'],
      equipment: ['Dumbbell'],
    });

    render(MovementPage);
    expectHeading('Movement');

    await screen.findByLabelText('Search exercises');
    await fireEvent.input(screen.getByLabelText('Search exercises'), {
      target: { value: 'squat' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Search exercises' }));

    await waitFor(() => {
      expect(screen.getByText('Goblet squat')).toBeTruthy();
      expect(screen.getByText(/Quadriceps · Dumbbell/i)).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }));
    await waitFor(() => {
      expect((screen.getByLabelText('Exercise 1') as HTMLInputElement).value).toBe('Goblet squat');
    });

    await fireEvent.input(screen.getByLabelText('Template name'), {
      target: { value: 'Full body reset' },
    });
    await fireEvent.input(screen.getByLabelText('Template goal'), {
      target: { value: 'Recovery' },
    });
    await fireEvent.input(screen.getByLabelText('Sets 1'), {
      target: { value: '3' },
    });
    await fireEvent.input(screen.getByLabelText('Reps 1'), {
      target: { value: '8' },
    });
    await fireEvent.input(screen.getByLabelText('Rest 1'), {
      target: { value: '60' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save template' }));

    await waitFor(() => {
      expect(screen.getByText(/Workout template saved\./i)).toBeTruthy();
      expect(screen.getByText('Full body reset')).toBeTruthy();
      expect(
        screen.getByText(/Recovery · 1 exercise · Goblet squat · 3x8 · 60s rest · Linked exercise/i)
      ).toBeTruthy();
    });
  });
});
