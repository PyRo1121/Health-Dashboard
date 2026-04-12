import { cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach } from 'vitest';
import {
  configureFeatureClientTestDb,
  resetFeatureClientTestDb,
} from '$lib/core/http/feature-client';
import { getTestHealthDb } from '$lib/core/db/test-client';

beforeEach(() => {
  configureFeatureClientTestDb(async () => getTestHealthDb());
});

afterEach(() => {
  resetFeatureClientTestDb();
  cleanup();
});
