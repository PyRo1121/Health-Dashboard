import { render, screen, waitFor } from '@testing-library/svelte';
import { resetHealthDb } from '$lib/core/db/client';
import { expect } from 'vitest';
import type { Component } from 'svelte';

export async function resetRouteDb() {
  await resetHealthDb();
}

export function renderRoute(component: Component) {
  render(component);
}

export function expectHeading(name: string) {
  expect(screen.getByRole('heading', { name })).toBeTruthy();
}

export async function waitForText(pattern: string | RegExp) {
  await waitFor(() => {
    expect(screen.getByText(pattern)).toBeTruthy();
  });
}
