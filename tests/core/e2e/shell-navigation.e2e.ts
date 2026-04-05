import { expect, test } from '@playwright/test';

test('shell navigation smoke test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Personal Health Cockpit · Overview');
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();

  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page).toHaveTitle('Personal Health Cockpit · Today');

  await page.getByRole('link', { name: 'Plan' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page).toHaveTitle('Personal Health Cockpit · Plan');

  await page.getByRole('link', { name: 'Movement' }).click();
  await expect(page).toHaveURL(/\/movement$/);
  await expect(page).toHaveTitle('Personal Health Cockpit · Movement');

  await page.getByRole('link', { name: 'Groceries' }).click();
  await expect(page).toHaveURL(/\/groceries$/);
  await expect(page).toHaveTitle('Personal Health Cockpit · Groceries');

  await page.getByRole('link', { name: 'Journal' }).click();
  await expect(page).toHaveURL(/\/journal$/);
  await expect(page).toHaveTitle('Personal Health Cockpit · Journal');

  await page.getByRole('link', { name: 'Review' }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page).toHaveTitle('Personal Health Cockpit · Review');
});
