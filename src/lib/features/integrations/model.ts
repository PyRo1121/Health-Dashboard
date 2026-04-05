import type { NativeCompanionSummary } from '$lib/core/domain/types';

export const integrationsOperatorNotes =
  'Use this page before import. Once the user has a file, send them to `/imports`. After commit, verify the result in Timeline and Review.';

export const integrationsClinicalInteroperabilityCopy =
  'T10 starts with a SMART on FHIR sandbox lane. Blue Button stays secondary until the source-scoped identity gate is in place.';

export const integrationsIdentityGateMessage =
  'Clinical imports stay blocked until one source-scoped patient mapping is explicitly confirmed.';

export function createConnectionStatusModel(summary: NativeCompanionSummary): {
  isConnected: boolean;
  message: string;
} {
  return summary.importedEvents
    ? {
        isConnected: true,
        message: `Imported native companion events: ${summary.importedEvents}`,
      }
    : {
        isConnected: false,
        message:
          'Download the Shortcut kit, run it on iPhone, then import the JSON file in `/imports`.',
      };
}
