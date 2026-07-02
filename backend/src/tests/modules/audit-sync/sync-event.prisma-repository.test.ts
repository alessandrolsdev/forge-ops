import { describe, expect, it, vi } from 'vitest';
import { PrismaSyncEventRepository } from '../../../modules/audit-sync/sync-event.prisma-repository.js';

const buildRecord = (overrides: Record<string, unknown> = {}) => {
  return {
    id: 'sync_123',
    repositoryId: 'repo_123',
    type: 'workflow_catalog_sync' as const,
    status: 'succeeded' as const,
    details: '3 workflow(s) sincronizado(s).',
    createdAt: new Date('2026-04-01T12:00:00.000Z'),
    ...overrides,
  };
};

describe('PrismaSyncEventRepository', () => {
  it('creates and maps a sync event record', async () => {
    const create = vi.fn().mockResolvedValue(buildRecord());
    const findMany = vi.fn();
    const repository = new PrismaSyncEventRepository({ create, findMany });

    await expect(
      repository.create({
        repositoryId: 'repo_123',
        type: 'workflow_catalog_sync',
        status: 'succeeded',
        details: '3 workflow(s) sincronizado(s).',
      }),
    ).resolves.toEqual(buildRecord());

    expect(create).toHaveBeenCalledWith({
      data: {
        repositoryId: 'repo_123',
        type: 'workflow_catalog_sync',
        status: 'succeeded',
        details: '3 workflow(s) sincronizado(s).',
      },
    });
  });

  it('lists sync events by repository ordered by newest first with limit', async () => {
    const create = vi.fn();
    const findMany = vi.fn().mockResolvedValue([buildRecord()]);
    const repository = new PrismaSyncEventRepository({ create, findMany });

    await expect(
      repository.listByRepositoryId('repo_123', 50),
    ).resolves.toEqual([buildRecord()]);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        repositoryId: 'repo_123',
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    });
  });
});
