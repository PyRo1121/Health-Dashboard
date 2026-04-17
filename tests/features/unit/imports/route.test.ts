import { afterEach, describe, expect, it, vi } from 'vitest';

describe('imports route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/imports/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    listImportBatchesServer?: ReturnType<typeof vi.fn>;
    previewImportServer?: ReturnType<typeof vi.fn>;
    commitImportBatchServer?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('$lib/server/imports/service', () => ({
      listImportBatchesServer: overrides.listImportBatchesServer ?? vi.fn(async () => []),
      previewImportServer:
        overrides.previewImportServer ??
        vi.fn(async () => ({
          sourceType: 'healthkit-companion',
          status: 'preview',
          summary: { adds: 3, duplicates: 0, warnings: 0 },
        })),
      commitImportBatchServer:
        overrides.commitImportBatchServer ??
        vi.fn(async () => ({
          id: 'batch-1',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-02T08:05:00.000Z',
          sourceType: 'healthkit-companion',
          status: 'committed',
        })),
    }));

    return await import('../../../../src/routes/api/imports/+server.ts');
  }

  it('lists import batches through the server imports service', async () => {
    const listImportBatchesServer = vi.fn(async () => [
      {
        id: 'batch-1',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        sourceType: 'healthkit-companion',
        status: 'staged',
      },
    ]);
    const { POST } = await importRoute({ listImportBatchesServer });

    const response = await POST({
      request: new Request('http://health.test/api/imports', {
        method: 'POST',
        body: JSON.stringify({ action: 'list' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      expect.objectContaining({ id: 'batch-1', status: 'staged' }),
    ]);
    expect(listImportBatchesServer).toHaveBeenCalledTimes(1);
  });

  it('previews imports through the server imports service', async () => {
    const previewImportServer = vi.fn(async () => ({
      sourceType: 'day-one-json',
      status: 'preview',
      summary: { adds: 1, duplicates: 0, warnings: 0 },
    }));
    const { POST } = await importRoute({ previewImportServer });
    const input = {
      sourceType: 'day-one-json',
      rawText: '{"entries":[]}',
      ownerProfile: null,
    };

    const response = await POST({
      request: new Request('http://health.test/api/imports', {
        method: 'POST',
        body: JSON.stringify({ action: 'preview', input }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        sourceType: 'day-one-json',
        status: 'preview',
        summary: { adds: 1, duplicates: 0, warnings: 0 },
      })
    );
    expect(previewImportServer).toHaveBeenCalledWith(input);
  });

  it('commits imports through the server imports service', async () => {
    const commitImportBatchServer = vi.fn(async () => ({
      id: 'batch-3',
      createdAt: '2026-04-02T08:00:00.000Z',
      updatedAt: '2026-04-02T08:05:00.000Z',
      sourceType: 'healthkit-companion',
      status: 'committed',
      summary: { adds: 3, duplicates: 0, warnings: 0 },
    }));
    const { POST } = await importRoute({ commitImportBatchServer });

    const response = await POST({
      request: new Request('http://health.test/api/imports', {
        method: 'POST',
        body: JSON.stringify({
          action: 'commit',
          input: {
            sourceType: 'healthkit-companion',
            rawText: '{}',
            ownerProfile: null,
          },
        }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ status: 'committed' }));
    expect(commitImportBatchServer).toHaveBeenCalledWith({
      sourceType: 'healthkit-companion',
      rawText: '{}',
      ownerProfile: null,
    });
  });

  it('returns 400 for invalid import payloads and service errors', async () => {
    const previewImportServer = vi.fn(async () => {
      throw new Error('Import preview failed.');
    });
    const { POST } = await importRoute({ previewImportServer });

    const invalid = await POST({
      request: new Request('http://health.test/api/imports', {
        method: 'POST',
        body: JSON.stringify({ action: 'preview', input: { rawText: 42 } }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(invalid.status).toBe(400);
    expect(await invalid.text()).toBe('Invalid import request payload.');

    const invalidSourceType = await POST({
      request: new Request('http://health.test/api/imports', {
        method: 'POST',
        body: JSON.stringify({
          action: 'preview',
          input: {
            sourceType: 'bogus',
            rawText: '{}',
            ownerProfile: null,
          },
        }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(invalidSourceType.status).toBe(400);
    expect(await invalidSourceType.text()).toBe('Invalid import request payload.');

    const invalidCommit = await POST({
      request: new Request('http://health.test/api/imports', {
        method: 'POST',
        body: JSON.stringify({ action: 'commit', batchId: 'batch-1' }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(invalidCommit.status).toBe(400);
    expect(await invalidCommit.text()).toBe('Invalid import request payload.');

    const failing = await POST({
      request: new Request('http://health.test/api/imports', {
        method: 'POST',
        body: JSON.stringify({
          action: 'preview',
          input: {
            sourceType: 'healthkit-companion',
            rawText: '{}',
            ownerProfile: null,
          },
        }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(failing.status).toBe(400);
    expect(await failing.text()).toBe('Import preview failed.');
  });
});
