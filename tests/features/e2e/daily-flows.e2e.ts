import { expect, test } from '@playwright/test';

const resetHeaders = { 'x-health-reset-token': 'codex-e2e' };

test.beforeEach(async ({ page }) => {
  const response = await page.request.post('/api/test/reset-db', { headers: resetHeaders });
  expect(response.ok()).toBe(true);
});

test('today daily check-in flow', async ({ page }) => {
  await page.goto('/today');
  await page.getByLabel('Mood').fill('4');
  await page.getByLabel('Energy').fill('3');
  await page.getByLabel('Stress').fill('2');
  await page.getByLabel('Focus').fill('5');
  await page.getByLabel('Sleep hours').fill('7.5');
  await page.getByLabel('Sleep quality').fill('4');
  await page.getByLabel('Today note').fill('Steady start.');
  await page.getByRole('button', { name: 'Save check-in' }).click();

  await expect(page.getByText('Saved for today.')).toBeVisible();
  await expect(page.getByText('Steady start.')).toBeVisible();
  await expect(page.locator('.event-list strong', { hasText: 'mood' })).toBeVisible();
});

test('journal entry flow', async ({ page }) => {
  await page.goto('/journal');
  await page.getByLabel('Title').fill('Morning check-in');
  await page.getByLabel('Body').fill('Woke up steady and ready to work.');
  await page.getByRole('button', { name: 'Save entry' }).click();

  await expect(page.locator('.entry-list strong').first()).toHaveText('Morning check-in');
  await expect(page.locator('.entry-list')).toContainText('Woke up steady and ready to work.');
});

test('sobriety flow', async ({ page }) => {
  await page.goto('/sobriety');
  await page.getByRole('button', { name: 'Mark sober today' }).click();
  await page.getByLabel('Craving score').fill('4');
  await page.getByLabel('Craving note').fill('Stress spike after lunch.');
  await page.getByRole('button', { name: 'Log craving' }).click();
  await expect(page.getByText(/Craving logged\./i)).toBeVisible();
  await page.getByLabel('Lapse note').fill('Had a lapse after a rough evening.');
  await page.getByLabel('Recovery action').fill('Text sponsor');
  await page.getByRole('button', { name: 'Log lapse context' }).click();
  await expect(page.getByText(/Lapse context logged\./i)).toBeVisible();

  await expect(page.getByText(/Current streak: 1 day/i)).toBeVisible();
  await expect(page.locator('.event-list')).toContainText('Stress spike after lunch.');
  await expect(page.locator('.event-list')).toContainText('Text sponsor');
});

test('assessment flow with safety branch', async ({ page }) => {
  await page.goto('/assessments');

  for (let index = 1; index <= 8; index += 1) {
    await page.getByLabel(`PHQ-9 question ${index}`).selectOption('1');
  }
  await page.getByLabel('PHQ-9 question 9').selectOption('1');
  await page.getByRole('button', { name: 'Save assessment' }).click();

  await expect(page.getByText(/Score: 9/i)).toBeVisible();
  await expect(page.getByText(/need more support than this app can provide/i)).toBeVisible();
});

test('nutrition flow with recurring meal reuse', async ({ page }) => {
  await page.goto('/nutrition');
  await page.getByLabel('Food search').fill('oatmeal');
  await page.getByRole('button', { name: 'Search foods' }).click();
  await page.getByRole('button', { name: 'Use match' }).click();
  await page.getByRole('button', { name: 'Save meal' }).click();
  await expect(page.getByText(/Meal saved\./i)).toBeVisible();
  await page.getByRole('button', { name: 'Save as recurring meal' }).click();
  await expect(page.getByText(/Recurring meal saved\./i)).toBeVisible();
  await page.getByRole('button', { name: 'Reuse meal' }).first().click();
  await expect(page.getByText(/Recurring meal reused\./i)).toBeVisible();

  const todaySummarySection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Today summary' }),
  });
  await expect(todaySummarySection.locator('.summary-list')).toContainText('Calories: 640');
});

test('weekly review flow', async ({ page }) => {
  await page.goto('/today');
  await page.getByLabel('Mood').fill('5');
  await page.getByLabel('Energy').fill('4');
  await page.getByLabel('Stress').fill('2');
  await page.getByLabel('Focus').fill('4');
  await page.getByLabel('Sleep hours').fill('8');
  await page.getByLabel('Sleep quality').fill('4');
  await page.getByRole('button', { name: 'Save check-in' }).click();

  await page.goto('/nutrition');
  await page.getByLabel('Food search').fill('oatmeal');
  await page.getByRole('button', { name: 'Search foods' }).click();
  await page.getByRole('button', { name: 'Use match' }).click();
  await page.getByRole('button', { name: 'Save meal' }).click();

  await page.goto('/sobriety');
  await page.getByRole('button', { name: 'Mark sober today' }).click();

  await page.goto('/assessments');
  for (let index = 1; index <= 5; index += 1) {
    await page.getByLabel(`PHQ-9 question ${index}`).selectOption('1');
  }
  for (let index = 6; index <= 9; index += 1) {
    await page.getByLabel(`PHQ-9 question ${index}`).selectOption('0');
  }
  await page.getByRole('button', { name: 'Save assessment' }).click();

  await page.goto('/review');
  await expect(page.getByText(/Weekly headline/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Next-week experiment' })).toBeVisible();
  await page.getByLabel('Next-week experiment').selectOption('Increase hydration tracking');
  await page.getByRole('button', { name: 'Save experiment' }).click();
  await expect(page.getByText(/Experiment saved\./i)).toBeVisible();
});

test('planned meal flows from nutrition into today logging', async ({ page }) => {
  await page.goto('/nutrition');
  await page.getByLabel('Food search').fill('oatmeal');
  await page.getByRole('button', { name: 'Search foods' }).click();
  await page.getByRole('button', { name: 'Use match' }).click();
  await page.getByRole('button', { name: 'Plan next meal' }).click();
  await expect(page.getByText(/Planned next meal saved\./i)).toBeVisible();

  await page.goto('/today');
  await expect(page.getByText('Oatmeal with berries')).toBeVisible();
  await expect(page.getByText('Projected calories: 320')).toBeVisible();
  await expect(page.getByText('Protein pace')).toBeVisible();
  await page.getByRole('button', { name: 'Log planned meal' }).click();
  await expect(page.getByText(/Planned meal logged\./i)).toBeVisible();

  const dailyBriefingSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Daily briefing' }),
  });
  await expect(dailyBriefingSection.locator('.summary-list')).toContainText('Meals logged: 1');
  await expect(page.getByText('Calories: 320')).toBeVisible();
});

test('weekly plan workout flows into today execution', async ({ page }) => {
  await page.goto('/plan');
  await page.getByLabel('Template name').fill('Full body reset');
  await page.getByLabel('Template goal').fill('Recovery');
  await page.getByLabel('Exercise 1').fill('Goblet squat');
  await page.getByLabel('Sets 1').fill('3');
  await page.getByLabel('Reps 1').fill('8');
  await page.getByLabel('Rest 1').fill('60');
  await page.getByRole('button', { name: 'Add exercise row' }).click();
  await page.getByLabel('Exercise 2').fill('Push-up');
  await page.getByLabel('Sets 2').fill('3');
  await page.getByLabel('Reps 2').fill('12');
  await page.getByLabel('Rest 2').fill('45');
  await page.getByRole('button', { name: 'Save template' }).click();
  await expect(page.getByText(/Workout template saved\./i)).toBeVisible();
  await expect(
    page.getByText(/Recovery · 2 exercises · Goblet squat · 3x8 · 60s rest/i)
  ).toBeVisible();

  await page.getByLabel('Plan slot type').selectOption('workout');
  await page.getByLabel('Workout template').selectOption({ label: 'Full body reset' });
  await page.getByRole('button', { name: 'Add to week' }).click();
  await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();

  await page.goto('/today');
  const plannedWorkoutSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Planned workout' }),
  });
  await expect(plannedWorkoutSection.getByText('Full body reset')).toBeVisible();
  await plannedWorkoutSection.getByRole('button', { name: 'Mark workout done' }).click();
  await expect(page.getByText(/Plan item marked done\./i)).toBeVisible();
});

test('weekly plan meal can be created from a saved food', async ({ page }) => {
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
  await page.getByLabel('Meal source').selectOption('food');
  await page.getByLabel('Saved food').selectOption({ label: 'Greek yogurt bowl' });
  await page.getByRole('button', { name: 'Add to week' }).click();
  await expect(page.getByText(/Plan slot saved\./i)).toBeVisible();
  await expect(page.getByText('Greek yogurt bowl')).toBeVisible();

  await page.goto('/today');
  await expect(page.getByText(/Saved food · Local catalog · 24g protein/i)).toBeVisible();
  await expect(page.getByText(/Projected protein: 24/i)).toBeVisible();
  await page.getByRole('button', { name: 'Log planned meal' }).click();
  await expect(page.getByText(/Planned meal logged\./i)).toBeVisible();
  await expect(page.getByText(/Latest meal: Greek yogurt bowl/i)).toBeVisible();
});
