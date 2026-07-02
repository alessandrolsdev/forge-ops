import { describe, expect, it, vi } from 'vitest';
import { RepositoryNotFoundError } from '../../../modules/repository-registry/repository.errors.js';
import { SyncEventService } from '../../../modules/audit-sync/sync-event.service.js';
import type { Repository } from '../../../modules/repository-registry/repository.entity.js';
import type { SyncEvent } from '../../../modules/audit-sync/sync-event.entity.js';

const buildRepository = (overrides: Partial<Repository> = {}): Repository => {
  const createdAt = new Date('2026-03-27T16:45:00.000Z');

  return {
    id: 'repo_123',
    githubRepoId: '123456789',
    owner: 'forgeops',
    name: 'backend',
    fullName: 'forgeops/backend',
    defaultBranch: 'main',
    isActive: true,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const buildSyncEvent = (overrides: Partial<SyncEvent> = {}): SyncEvent => {
  return {
    id: 'sync_123',
    repositoryId: 'repo_123',
    type: 'workflow_catalog_sync',
    status: 'succeeded',
    details: '3 workflow(s) sincronizado(s).',
    createdAt: new Date('2026-04-01T12:00:00.000Z'),
    ...overrides,
  };
};

describe('SyncEventService', () => {
  it('records a sync event through the repository', async () => {
    const create = vi.fn().mockResolvedValue(buildSyncEvent());
    const service = new SyncEventService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn(),
        deleteById: vi.fn(),
      },
      syncEventRepository: {
        create,
        listByRepositoryId: vi.fn(),
      },
    });

    await service.record({
      repositoryId: 'repo_123',
      type: 'workflow_catalog_sync',
      status: 'succeeded',
      details: '3 workflow(s) sincronizado(s).',
    });

    expect(create).toHaveBeenCalledWith({
      repositoryId: 'repo_123',
      type: 'workflow_catalog_sync',
      status: 'succeeded',
      details: '3 workflow(s) sincronizado(s).',
    });
  });

  it('swallows persistence failures when recording so syncs are never interrupted', async () => {
    const error = vi.fn();
    const service = new SyncEventService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn(),
        deleteById: vi.fn(),
      },
      syncEventRepository: {
        create: vi.fn().mockRejectedValue(new Error('database unavailable')),
        listByRepositoryId: vi.fn(),
      },
      logger: {
        info: vi.fn(),
        error,
      },
    });

    await expect(
      service.record({
        repositoryId: 'repo_123',
        type: 'pull_requests_sync',
        status: 'failed',
        details: 'Sincronizacao falhou.',
      }),
    ).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'sync_event_record_failed' }),
      expect.any(String),
    );
  });

  it('lists sync events for an existing repository with the default limit', async () => {
    const listByRepositoryId = vi
      .fn()
      .mockResolvedValue([buildSyncEvent()]);
    const service = new SyncEventService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      syncEventRepository: {
        create: vi.fn(),
        listByRepositoryId,
      },
    });

    await expect(service.listByRepositoryId('repo_123')).resolves.toEqual([
      buildSyncEvent(),
    ]);
    expect(listByRepositoryId).toHaveBeenCalledWith('repo_123', 50);
  });

  it('throws RepositoryNotFoundError when listing an unknown repository', async () => {
    const service = new SyncEventService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        deleteById: vi.fn(),
      },
      syncEventRepository: {
        create: vi.fn(),
        listByRepositoryId: vi.fn(),
      },
    });

    await expect(
      service.listByRepositoryId('repo_missing'),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });
});
