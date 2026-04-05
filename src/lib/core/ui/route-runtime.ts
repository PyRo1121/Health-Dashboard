import { onMount } from 'svelte';
import { browser } from '$app/environment';

function isDatabaseClosedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'DatabaseClosedError' || /database has been closed/i.test(error.message))
  );
}

export function onBrowserRouteMount(run: () => void | (() => void) | Promise<void>): void {
  onMount(() => {
    if (!browser) return;
    const result = run();
    if (typeof result === 'function') {
      return result;
    }
    void Promise.resolve(result).catch((error) => {
      if (!isDatabaseClosedError(error)) {
        throw error;
      }
    });
  });
}
