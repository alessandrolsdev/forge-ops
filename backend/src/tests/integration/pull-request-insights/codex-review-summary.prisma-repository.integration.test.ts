import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaCodexReviewSummaryRepository } from '../../../modules/pull-request-insights/codex-review-summary.prisma-repository.js';
import { createIntegrationPrismaClient, resetDatabase } from '../setup/integration-db.js';

const prisma: PrismaClient = createIntegrationPrismaClient();

const createRepository = async (fullName: string) => {
  const [owner, name] = fullName.split('/');

  return prisma.repository.create({
    data: {
      githubRepoId: `gh_${fullName}`,
      owner: owner ?? 'forgeops',
      name: name ?? 'sample-repo',
      fullName,
      defaultBranch: 'main',
    },
  });
};

const createPullRequest = async (
  repositoryId: string,
  number: number,
) => {
  return prisma.pullRequest.create({
    data: {
      repositoryId,
      githubPrId: `pr_gh_${repositoryId}_${number}`,
      number,
      title: `Pull request ${number}`,
      state: 'open',
      author: 'alessandrolsdev',
      baseBranch: 'main',
      headBranch: `feature/pr-${number}`,
    },
  });
};

const createSummary = async (pullRequestId: string, blockersCount: number) => {
  return prisma.codexReviewSummary.create({
    data: {
      pullRequestId,
      source: 'workflow_comment',
      summary: 'Codex review summary',
      blockersCount,
      suggestionsCount: 1,
      risksCount: 1,
      rawContent: '[P1] Achado de teste',
    },
  });
};

describe('PrismaCodexReviewSummaryRepository (integration)', () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await prisma.$disconnect();
  });

  it('lists only the summaries that belong to the repository', async () => {
    const repository = await createRepository('forgeops/target-repo');
    const otherRepository = await createRepository('forgeops/other-repo');
    const pullRequest = await createPullRequest(repository.id, 1);
    const otherPullRequest = await createPullRequest(otherRepository.id, 1);

    await createSummary(pullRequest.id, 2);
    await createSummary(otherPullRequest.id, 5);

    const repositoryUnderTest = new PrismaCodexReviewSummaryRepository(
      prisma.codexReviewSummary,
    );

    const summaries = await repositoryUnderTest.listByRepositoryId(
      repository.id,
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.pullRequestId).toBe(pullRequest.id);
    expect(summaries[0]?.blockersCount).toBe(2);
  });

  it('returns an empty list for repositories without reviewed pull requests', async () => {
    const repository = await createRepository('forgeops/empty-repo');
    const repositoryUnderTest = new PrismaCodexReviewSummaryRepository(
      prisma.codexReviewSummary,
    );

    await expect(
      repositoryUnderTest.listByRepositoryId(repository.id),
    ).resolves.toEqual([]);
  });
});
