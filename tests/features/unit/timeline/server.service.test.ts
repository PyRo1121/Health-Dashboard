import { afterEach, describe, expect, it, vi } from 'vitest';

describe('timeline server service', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/db/drizzle/client');
    vi.doUnmock('$lib/server/db/drizzle/mirror');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('preserves reference urls when loading timeline items from the server mirror', async () => {
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectAllMirrorRecords: vi.fn(async () => [
        {
          id: 'symptom-headache',
          createdAt: '2026-04-02T12:00:00Z',
          updatedAt: '2026-04-02T12:00:00Z',
          sourceType: 'manual',
          sourceApp: 'personal-health-cockpit',
          sourceTimestamp: '2026-04-02T12:00:00Z',
          localDay: '2026-04-02',
          confidence: 1,
          eventType: 'symptom',
          value: 4,
          payload: {
            kind: 'symptom',
            symptom: 'Headache',
            severity: 4,
            referenceUrl:
              'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
          },
        },
      ]),
    }));

    const service = await import('../../../../src/lib/server/timeline/service.ts');
    const result = await service.listTimelineEventsServer();

    expect(result).toEqual([
      expect.objectContaining({
        label: 'Symptom',
        referenceUrl:
          'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
      }),
    ]);
  });
});
