export interface SourceScopedPatientRef {
  connectorId: string;
  sourcePatientId: string;
}

export interface SourceScopedClinicalResourceRef extends SourceScopedPatientRef {
  resourceType: string;
  resourceId: string;
}

export function buildSourceScopeKey(ref: SourceScopedPatientRef): string {
  return `${ref.connectorId}:${ref.sourcePatientId}`;
}

export function buildScopedClinicalResourceKey(ref: SourceScopedClinicalResourceRef): string {
  return `${buildSourceScopeKey(ref)}:${ref.resourceType}:${ref.resourceId}`;
}
