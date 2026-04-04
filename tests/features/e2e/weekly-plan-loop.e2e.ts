import { expect, test } from '@playwright/test';

const resetHeaders = { 'x-health-reset-token': 'codex-e2e' };

function emptySnapshot() {
	return {
		dailyRecords: [],
		journalEntries: [],
		foodEntries: [],
		foodCatalogItems: [],
		recipeCatalogItems: [],
		plannedMeals: [],
		weeklyPlans: [],
		planSlots: [],
		groceryItems: [],
		workoutTemplates: [],
		exerciseCatalogItems: [],
		favoriteMeals: [],
		healthEvents: [],
		healthTemplates: [],
		sobrietyEvents: [],
		assessmentResults: [],
		importBatches: [],
		importArtifacts: [],
		reviewSnapshots: []
	};
}

test.beforeEach(async ({ page }) => {
	const response = await page.request.post('/api/test/reset-db', { headers: resetHeaders });
	expect(response.ok()).toBe(true);
});

test('weekly plan loop connects plan, today, and review', async ({ page }) => {
	const seedResponse = await page.request.post('/api/db/migrate', {
		data: {
			snapshot: {
				...emptySnapshot(),
				recipeCatalogItems: [
					{
						id: 'themealdb:52772',
						createdAt: '2026-04-03T00:00:00.000Z',
						updatedAt: '2026-04-03T00:00:00.000Z',
						title: 'Teriyaki Chicken Casserole',
						sourceType: 'themealdb',
						sourceName: 'TheMealDB',
						externalId: '52772',
						mealType: 'dinner',
						cuisine: 'Japanese',
						ingredients: ['3/4 cup soy sauce', '2 chicken breast']
					}
				]
			}
		}
	});
	expect(seedResponse.ok()).toBe(true);

	await page.goto('/nutrition');
	await page.getByLabel('Meal name').fill('Greek yogurt bowl');
	await page.getByLabel('Calories').fill('310');
	await page.getByLabel('Protein').fill('24');
	await page.getByLabel('Fiber').fill('6');
	await page.getByLabel('Carbs').fill('34');
	await page.getByLabel('Fat').fill('8');
	await page.getByRole('button', { name: 'Save as custom food' }).click();
	await expect(page.getByText(/Saved to custom food catalog\./i)).toBeVisible();

	await page.goto('/plan');
	await expect(page.getByText(/No workout templates yet\./i)).toBeVisible();
	await expect(page.getByText(/No grocery items yet\./i)).toBeVisible();

	await page.getByLabel('Recipe').selectOption('themealdb:52772');
	await page.getByRole('button', { name: 'Add to week' }).click();
	await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();
	await expect(page.getByText('soy sauce')).toBeVisible();
	await expect(page.getByText('chicken breast')).toBeVisible();

	await page.getByRole('button', { name: 'On hand' }).first().click();
	await expect(page.getByText(/Grocery item updated\./i)).toBeVisible();

	await page.getByLabel('Template name').fill('Full body reset');
	await page.getByLabel('Template goal').fill('Recovery');
	await page.getByLabel('Exercise 1').fill('Goblet squat');
	await page.getByLabel('Sets 1').fill('3');
	await page.getByLabel('Reps 1').fill('8');
	await page.getByLabel('Rest 1').fill('60');
	await page.getByRole('button', { name: 'Save template' }).click();
	await expect(page.getByText(/Workout template saved\./i)).toBeVisible();

	await page.getByLabel('Plan slot type').selectOption('workout');
	await page.getByLabel('Workout template').selectOption({ label: 'Full body reset' });
	await page.getByRole('button', { name: 'Add to week' }).click();
	await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();

	await page.getByLabel('Plan slot type').selectOption('meal');
	await page.getByLabel('Meal source').selectOption('food');
	await page.getByLabel('Saved food').selectOption({ label: 'Greek yogurt bowl' });
	await page.getByRole('button', { name: 'Add to week' }).click();
	await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();

	await page.goto('/today');
	const plannedMealSection = page.locator('section').filter({
		has: page.getByRole('heading', { name: 'Planned next meal' })
	});
	const plannedWorkoutSection = page.locator('section').filter({
		has: page.getByRole('heading', { name: 'Planned workout' })
	});
	await expect(plannedMealSection.getByText('Greek yogurt bowl')).toBeVisible();
	await expect(plannedWorkoutSection).toContainText('Full body reset');
	await page.getByRole('button', { name: 'Log planned meal' }).click();
	await expect(page.getByText(/Planned meal logged\./i)).toBeVisible();
	await page.getByRole('button', { name: 'Mark workout done' }).click();
	await expect(page.getByText(/Plan item marked done\./i)).toBeVisible();

	await page.getByLabel('Mood').fill('4');
	await page.getByLabel('Energy').fill('3');
	await page.getByLabel('Stress').fill('2');
	await page.getByLabel('Focus').fill('4');
	await page.getByLabel('Sleep hours').fill('7.5');
	await page.getByLabel('Sleep quality').fill('4');
	await page.getByRole('button', { name: 'Save check-in' }).click();
	await expect(page.getByText(/Saved for today\./i)).toBeVisible();

	await page.goto('/review');
	await expect(page.getByText(/Plan follow-through/i)).toBeVisible();
	await expect(page.getByText(/This Week: 2\/3 plan items completed\./i)).toBeVisible();
	await expect(page.getByText(/Meals planned: 1\/2 completed\./i)).toBeVisible();
	await expect(page.getByText(/Workouts planned: 1\/1 completed\./i)).toBeVisible();
	await expect(page.getByText(/Groceries: 0\/2 checked, 1 on hand\./i)).toBeVisible();
});
