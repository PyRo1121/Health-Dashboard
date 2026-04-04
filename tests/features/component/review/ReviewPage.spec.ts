import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import ReviewPage from '../../../../src/routes/review/+page.svelte';
import { resetRouteDb, expectHeading, waitForText } from '../../../support/component/routeHarness';
import { seedReviewSnapshotInputs } from '../../../support/component/routeSeeds';

describe('Review route', () => {
	beforeEach(async () => {
		await resetRouteDb();
	});

	it('renders an empty-state weekly briefing when there is no data', async () => {
		render(ReviewPage);
		expectHeading('Review');
		await waitForText(/Need more data to build your first weekly briefing/i);
	});

	it('shows a weekly briefing and saves an experiment', async () => {
		await seedReviewSnapshotInputs();

		render(ReviewPage);

		await waitForText(/Mindful reset/i);
		await waitForText(/Higher sleep tracked with better mood/i);
		await waitForText(/Low sleep lined up with higher anxiety on 2026-03-31/i);
		await waitForText(/Greek yogurt bowl/i);
		await waitForText(/Teriyaki Chicken Casserole/i);
		await waitForText(/This Week: 1\/2 plan items completed\./i);
		await waitForText(/Groceries: 1\/2 checked|Groceries: 1\/1 checked, 1 on hand/i);
		await waitForText(/Sleep duration: 8 hours on 2026-04-02/i);
		expect(screen.getByRole('link', { name: 'Load food' }).getAttribute('href')).toMatch(
			/^\/nutrition\?loadKind=food&loadId=/
		);
		expect(screen.getByRole('link', { name: 'Load recipe' }).getAttribute('href')).toBe(
			'/nutrition?loadKind=recipe&loadId=themealdb%3A52772'
		);

		await fireEvent.change(screen.getByLabelText('Next-week experiment'), {
			target: { value: 'Increase hydration tracking' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Save experiment' }));

		await waitFor(() => {
			expect(screen.getByText(/Experiment saved\./i)).toBeTruthy();
		});
	});
});
