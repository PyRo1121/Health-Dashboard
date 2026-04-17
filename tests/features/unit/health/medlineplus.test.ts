import { describe, expect, it } from 'vitest';
import {
  buildMedlinePlusMedicationLink,
  buildMedlinePlusProblemLink,
} from '$lib/server/health/medlineplus';

describe('medlineplus links', () => {
  it('builds a MedlinePlus Connect application link for ICD-10 problem codes', () => {
    expect(buildMedlinePlusProblemLink('R51', 'Headache')).toBe(
      'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en'
    );
  });

  it('builds a MedlinePlus Connect application link for RxNorm medication codes', () => {
    expect(buildMedlinePlusMedicationLink('860975', 'Metformin 500 MG Oral Tablet')).toBe(
      'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en'
    );
  });

  it('returns null for blank medication codes', () => {
    expect(buildMedlinePlusMedicationLink('   ', 'Metformin 500 MG Oral Tablet')).toBeNull();
  });
});
