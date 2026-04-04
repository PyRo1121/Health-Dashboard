import { onMount } from 'svelte';
import { browser } from '$app/environment';

export function onBrowserRouteMount(
	run: () => void | (() => void) | Promise<void>
): void {
	onMount(() => {
		if (!browser) return;
		const result = run();
		if (typeof result === 'function') {
			return result;
		}
		void result;
	});
}
