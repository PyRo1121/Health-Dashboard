import { SHORTCUT_BLUEPRINT_MARKDOWN, SHORTCUT_TEMPLATE_JSON } from '$lib/features/integrations/shortcut-kit';

function responseHeaders(contentType: string, disposition: string): HeadersInit {
	return {
		'content-type': `${contentType}; charset=utf-8`,
		'content-disposition': disposition
	};
}

export function createShortcutTemplateResponse(): Response {
	return new Response(SHORTCUT_TEMPLATE_JSON, {
		headers: responseHeaders(
			'application/json',
			'attachment; filename="healthkit-companion-template.json"'
		)
	});
}

export function createShortcutBlueprintResponse(): Response {
	return new Response(SHORTCUT_BLUEPRINT_MARKDOWN, {
		headers: responseHeaders('text/markdown', 'inline; filename="shortcut-blueprint.md"')
	});
}
