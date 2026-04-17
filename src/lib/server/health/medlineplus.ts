const MEDLINEPLUS_CONNECT_APPLICATION_URL = 'https://connect.medlineplus.gov/application';
const ICD10_CODE_SYSTEM_OID = '2.16.840.1.113883.6.90';
const RXCUI_CODE_SYSTEM_OID = '2.16.840.1.113883.6.88';

export function buildMedlinePlusProblemLink(code: string, label: string): string | null {
  const normalizedCode = code.trim();
  const normalizedLabel = label.trim();

  if (!normalizedCode || !normalizedLabel) {
    return null;
  }

  const params = new URLSearchParams({
    'mainSearchCriteria.v.cs': ICD10_CODE_SYSTEM_OID,
    'mainSearchCriteria.v.c': normalizedCode,
    'mainSearchCriteria.v.dn': normalizedLabel,
    'informationRecipient.languageCode.c': 'en',
  });

  return `${MEDLINEPLUS_CONNECT_APPLICATION_URL}?${params.toString()}`;
}

export function buildMedlinePlusMedicationLink(code: string, label: string): string | null {
  const normalizedCode = code.trim();
  const normalizedLabel = label.trim();

  if (!normalizedCode || !normalizedLabel) {
    return null;
  }

  const params = new URLSearchParams({
    'mainSearchCriteria.v.cs': RXCUI_CODE_SYSTEM_OID,
    'mainSearchCriteria.v.c': normalizedCode,
    'mainSearchCriteria.v.dn': normalizedLabel,
    'informationRecipient.languageCode.c': 'en',
  });

  return `${MEDLINEPLUS_CONNECT_APPLICATION_URL}?${params.toString()}`;
}
