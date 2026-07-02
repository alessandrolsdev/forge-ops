import { describe, expect, it, vi } from 'vitest';
import { PrismaPolicyCheckRepository } from '../../../modules/policy-engine/policy-check.prisma-repository.js';

const buildRecord = (overrides: Record<string, unknown> = {}) => {
  const checkedAt = new Date('2026-04-01T10:00:00.000Z');

  return {
    id: 'policy_123',
    repositoryId: 'repo_123',
    policyKey: 'ci_workflow_present' as const,
    status: 'compliant' as const,
    details: 'Found 1 active workflow(s).',
    checkedAt,
    createdAt: checkedAt,
    updatedAt: checkedAt,
    ...overrides,
  };
};

describe('PrismaPolicyCheckRepository', () => {
  it('upserts a policy check keyed by repository and policy key', async () => {
    const upsert = vi.fn().mockResolvedValue(buildRecord());
    const findMany = vi.fn();
    const repository = new PrismaPolicyCheckRepository({ upsert, findMany });

    const checkedAt = new Date('2026-04-01T10:00:00.000Z');

    await expect(
      repository.upsert({
        repositoryId: 'repo_123',
        policyKey: 'ci_workflow_present',
        status: 'compliant',
        details: 'Found 1 active workflow(s).',
        checkedAt,
      }),
    ).resolves.toEqual(buildRecord());

    expect(upsert).toHaveBeenCalledWith({
      where: {
        repositoryId_policyKey: {
          repositoryId: 'repo_123',
          policyKey: 'ci_workflow_present',
        },
      },
      create: {
        repositoryId: 'repo_123',
        policyKey: 'ci_workflow_present',
        status: 'compliant',
        details: 'Found 1 active workflow(s).',
        checkedAt,
      },
      update: {
        status: 'compliant',
        details: 'Found 1 active workflow(s).',
        checkedAt,
      },
    });
  });

  it('lists policy checks for a repository ordered by policy key', async () => {
    const upsert = vi.fn();
    const findMany = vi.fn().mockResolvedValue([buildRecord()]);
    const repository = new PrismaPolicyCheckRepository({ upsert, findMany });

    await expect(repository.listByRepositoryId('repo_123')).resolves.toEqual([
      buildRecord(),
    ]);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        repositoryId: 'repo_123',
      },
      orderBy: [{ policyKey: 'asc' }],
    });
  });
});
