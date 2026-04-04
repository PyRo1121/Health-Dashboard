import { postFeatureRequest } from '$lib/core/http/feature-client';
import {
	createIntegrationsPageState,
	loadIntegrationsPage as loadIntegrationsPageController,
	type IntegrationsPageState
} from './controller';

export { createIntegrationsPageState };

export async function loadIntegrationsPage(): Promise<IntegrationsPageState> {
	return await postFeatureRequest(
		'/api/integrations',
		{ action: 'load' },
		(db) => loadIntegrationsPageController(db)
	);
}
