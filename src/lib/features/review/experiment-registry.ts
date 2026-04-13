export const REVIEW_EXPERIMENT_DEFINITIONS = [
  {
    id: 'mindfulness-10min-morning',
    label: 'Try 10 min morning mindfulness',
  },
  {
    id: 'hydration-tracking',
    label: 'Increase hydration tracking',
  },
  {
    id: 'protein-breakfast',
    label: 'Increase protein at breakfast',
  },
] as const;

export type ReviewExperimentDefinition = (typeof REVIEW_EXPERIMENT_DEFINITIONS)[number];
export type ReviewExperimentId = ReviewExperimentDefinition['id'];
export type ReviewExperimentLabel = ReviewExperimentDefinition['label'];

export function reviewExperimentDefinitionById(id: string): ReviewExperimentDefinition | undefined {
  return REVIEW_EXPERIMENT_DEFINITIONS.find((definition) => definition.id === id);
}

export function reviewExperimentDefinitionByLabel(
  label: string
): ReviewExperimentDefinition | undefined {
  return REVIEW_EXPERIMENT_DEFINITIONS.find((definition) => definition.label === label);
}

export function reviewExperimentLabel(id: ReviewExperimentId): ReviewExperimentLabel {
  return reviewExperimentDefinitionById(id)?.label ?? REVIEW_EXPERIMENT_DEFINITIONS[0]!.label;
}

export function reviewExperimentIdFromLabel(label: string | undefined): ReviewExperimentId | null {
  if (!label) return null;
  return reviewExperimentDefinitionByLabel(label)?.id ?? null;
}
