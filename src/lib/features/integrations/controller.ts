import type { HealthDatabase } from '$lib/core/db/types';
import type { NativeCompanionSummary } from '$lib/core/domain/types';
import { summarizeNativeCompanionEvents } from '$lib/features/integrations/service';

export interface IntegrationsPageState {
	loading: boolean;
	summary: NativeCompanionSummary;
}

export function createIntegrationsPageState(): IntegrationsPageState {
	return {
		loading: true,
		summary: {
			importedEvents: 0,
			deviceNames: [],
			metricTypes: [],
			latestCaptureAt: undefined
		}
	};
}

export async function loadIntegrationsPage(
	db: HealthDatabase
): Promise<IntegrationsPageState> {
	return {
		loading: false,
		summary: await summarizeNativeCompanionEvents(db)
	};
}
