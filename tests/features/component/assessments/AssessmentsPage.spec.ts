import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import AssessmentsPage from '../../../../src/routes/assessments/+page.svelte';
import { expectHeading, resetRouteDb, waitForText } from '../../../support/component/routeHarness';

describe('Assessments route', () => {
	beforeEach(async () => {
		await resetRouteDb();
	});

	it('renders the PHQ-9 form by default', async () => {
		render(AssessmentsPage);
		expectHeading('Assessments');
		await waitForText(/Over the last 2 weeks/i);
		await waitForText(/Little interest or pleasure in doing things/i);
	});

	it('submits PHQ-9 and shows the safety banner when item 9 is non-zero', async () => {
		render(AssessmentsPage);

		await screen.findByLabelText('PHQ-9 question 1');
		for (let index = 1; index <= 8; index += 1) {
			await fireEvent.change(screen.getByLabelText(`PHQ-9 question ${index}`), {
				target: { value: '1' }
			});
		}
		await fireEvent.change(screen.getByLabelText('PHQ-9 question 9'), {
			target: { value: '1' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Save assessment' }));

		await waitFor(() => {
			const latestResultCard = screen.getByText('Latest result').closest('section');
			expect(latestResultCard?.textContent).toContain('Score: 9');
			expect(screen.getByText(/need more support than this app can provide/i)).toBeTruthy();
		});
	});
});
