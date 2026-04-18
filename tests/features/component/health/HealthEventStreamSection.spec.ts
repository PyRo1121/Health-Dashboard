import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import HealthEventStreamSection from '../../../../src/lib/features/health/components/HealthEventStreamSection.svelte';
import type { HealthEventRow } from '$lib/features/health/model';

describe('HealthEventStreamSection', () => {
  it('renders a learn-more link for safe symptom reference urls', () => {
    const eventRows: HealthEventRow[] = [
      {
        id: 'symptom-1',
        title: 'Headache',
        badge: 'Severity 4/5',
        lines: ['After lunch'],
        meta: 'Manual · 3:00 PM',
        referenceUrl:
          'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
      },
    ];

    render(HealthEventStreamSection, { eventRows });

    expect(
      screen.getByRole('link', { name: /learn more about logged medication headache/i })
    ).toHaveProperty(
      'href',
      'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en'
    );
  });

  it('does not render learn-more links for unsafe reference urls', () => {
    const eventRows: HealthEventRow[] = [
      {
        id: 'symptom-unsafe',
        title: 'Unsafe symptom',
        badge: 'Severity 3/5',
        lines: [],
        meta: 'Manual · 3:00 PM',
        referenceUrl: 'javascript:alert(1)',
      },
    ];

    render(HealthEventStreamSection, { eventRows });

    expect(screen.queryByRole('link', { name: /learn more/i })).toBeNull();
  });
});
