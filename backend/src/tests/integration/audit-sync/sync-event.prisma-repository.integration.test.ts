import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaSyncEventRepository } from '../../../modules/audit-sync/sync-event.prisma-repository.js';
import { createIntegrationPrismaClient, resetDatabase } from '../setup/integration-db.js';

const prisma: PrismaClient = createIntegrationPrismaClient();

const createRepository = async () => {
  return prisma.repository.create({
    data: {
      githubRepoId: '1001',
      owner: 'forgeops',
      name: 'sample-repo',
      fullName: 'forgeops/sample-repo',
      defaultBranch: 'main',
    },
  });
};

describe('PrismaSyncEventRepository (integration)', () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await prisma.$disconnect();
  });

  it('persists sync events and lists them newest first with limit', async () => {
    const repository = await createRepository();
    const repositoryUnderTest = new PrismaSyncEventRepository(
      prisma.syncEvent,
    );

    await repositoryUnderTest.create({
      repositoryId: repository.id,
      type: 'workflow_catalog_sync',
      status: 'succeeded',
      details: '2 workflow(s) sincronizado(s).',
    });
    await repositoryUnderTest.create({
      repositoryId: repository.id,
      type: 'pull_requests_sync',
      status: 'failed',
      details: 'Sincronizacao de pull requests falhou: Error.',
    });

    const twoMostRecent = await repositoryUnderTest.listByRepositoryId(
      repository.id,
      50,
    );

    expect(twoMostRecent).toHaveLength(2);
    expect(twoMostRecent[0]?.type).toBe('pull_requests_sync');
    expect(twoMostRecent[0]?.status).toBe('failed');
    expect(twoMostRecent[1]?.type).toBe('workflow_catalog_sync');

    const limited = await repositoryUnderTest.listByRepositoryId(
      repository.id,
      1,
    );

    expect(limited).toHaveLength(1);
  });
});
