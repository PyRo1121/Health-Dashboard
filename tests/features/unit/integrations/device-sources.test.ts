import { describe, expect, it } from 'vitest';
import { DEVICE_SOURCE_MANIFESTS } from '$lib/features/integrations/manifests/device-sources';

describe('device source manifest', () => {
	it('keeps the iPhone lane pointed at the no-Mac Shortcut flow', () => {
		expect(DEVICE_SOURCE_MANIFESTS).toHaveLength(1);

		const manifest = DEVICE_SOURCE_MANIFESTS[0];
		expect(manifest.primaryPath).toBe('shortcuts-json');
		expect(manifest.fallbackPath).toBe('apple-health-xml');
		expect(manifest.automationSurface).toBe('Shortcuts');
		expect(manifest.docsPath).toBe('/apps/ios-shortcuts/README.md');
		expect(manifest.downloadTemplatePath).toBe('/downloads/ios-shortcuts/healthkit-companion-template.json');
		expect(manifest.downloadBlueprintPath).toBe('/downloads/ios-shortcuts/shortcut-blueprint.md');
	});
});
