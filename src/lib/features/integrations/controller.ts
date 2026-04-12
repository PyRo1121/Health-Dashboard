import type { NativeCompanionSummary } from '$lib/core/domain/types';
import {
  summarizeNativeCompanionEvents,
  type NativeCompanionEventsStore,
} from '$lib/features/integrations/service';

export type IntegrationsPageStorage = NativeCompanionEventsStore;

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
      latestCaptureAt: undefined,
    },
  };
}

export async function loadIntegrationsPage(
  store: IntegrationsPageStorage
): Promise<IntegrationsPageState> {
  return {
    loading: false,
    summary: await summarizeNativeCompanionEvents(store),
  };
}
