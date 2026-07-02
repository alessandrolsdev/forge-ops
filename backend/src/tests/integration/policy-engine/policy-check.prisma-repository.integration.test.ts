import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaPolicyCheckRepository } from '../../../modules/policy-engine/policy-check.prisma-repository.js';
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

describe('PrismaPolicyCheckRepository (integration)', () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await prisma.$disconnect();
  });

  it('upserts idempotently per repository and policy key', async () => {
    const repository = await createRepository();
    const repositoryUnderTest = new PrismaPolicyCheckRepository(
      prisma.policyCheck,
    );

    const first = await repositoryUnderTest.upsert({
      repositoryId: repository.id,
      policyKey: 'ci_workflow_present',
      status: 'non_compliant',
      details: 'No active workflows are registered for this repository.',
      checkedAt: new Date('2026-06-01T10:00:00.000Z'),
    });

    const second = await repositoryUnderTest.upsert({
      repositoryId: repository.id,
      policyKey: 'ci_workflow_present',
      status: 'compliant',
      details: 'Found 2 active workflow(s).',
      checkedAt: new Date('2026-06-02T10:00:00.000Z'),
    });

    expect(second.id).toBe(first.id);
    expect(second.status).toBe('compliant');
    expect(second.checkedAt.toISOString()).toBe('2026-06-02T10:00:00.000Z');

    const persisted = await repositoryUnderTest.listByRepositoryId(
      repository.id,
    );

    expect(persisted).toHaveLength(1);
  });

  it('lists policy checks ordered by policy key', async () => {
    const repository = await createRepository();
    const repositoryUnderTest = new PrismaPolicyCheckRepository(
      prisma.policyCheck,
    );
    const checkedAt = new Date('2026-06-01T10:00:00.000Z');

    await repositoryUnderTest.upsert({
      repositoryId: repository.id,
      policyKey: 'test_workflow_present',
      status: 'non_compliant',
      details: "No active workflow with 'test' in its name or path.",
      checkedAt,
    });
    await repositoryUnderTest.upsert({
      repositoryId: repository.id,
      policyKey: 'ci_workflow_present',
      status: 'compliant',
      details: 'Found 1 active workflow(s).',
      checkedAt,
    });

    const persisted = await repositoryUnderTest.listByRepositoryId(
      repository.id,
    );

    expect(persisted.map((check) => check.policyKey)).toEqual([
      'ci_workflow_present',
      'test_workflow_present',
    ]);
  });
});
