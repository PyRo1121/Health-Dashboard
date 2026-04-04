import { describe, expect, it } from 'vitest';
import {
	createShortcutBlueprintResponse,
	createShortcutTemplateResponse
} from '$lib/features/integrations/downloads';

describe('integration download responses', () => {
	it('serves the shortcut template as downloadable json', async () => {
		const response = createShortcutTemplateResponse();

		expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
		expect(response.headers.get('content-disposition')).toBe(
			'attachment; filename="healthkit-companion-template.json"'
		);
		expect(await response.text()).toContain('"connector": "healthkit-ios"');
	});

	it('serves the shortcut blueprint as inline markdown', async () => {
		const response = createShortcutBlueprintResponse();

		expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
		expect(response.headers.get('content-disposition')).toBe(
			'inline; filename="shortcut-blueprint.md"'
		);
		expect(await response.text()).toContain('Shortcut Blueprint: Health Cockpit Export');
	});
});
