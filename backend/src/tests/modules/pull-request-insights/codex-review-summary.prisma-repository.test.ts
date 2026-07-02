import { describe, expect, it, vi } from 'vitest';
import { CodexReviewSummaryAlreadyExistsError } from '../../../modules/pull-request-insights/codex-review-summary.errors.js';
import { PrismaCodexReviewSummaryRepository } from '../../../modules/pull-request-insights/codex-review-summary.prisma-repository.js';

interface CodexReviewSummaryRecord {
  id: string;
  pullRequestId: string;
  source: 'github_review' | 'workflow_comment';
  summary: string;
  blockersCount: number;
  suggestionsCount: number;
  risksCount: number;
  rawContent: string;
  createdAt: Date;
  updatedAt: Date;
}

const buildRecord = (
  overrides: Partial<CodexReviewSummaryRecord> = {},
): CodexReviewSummaryRecord => {
  const createdAt = new Date('2026-04-02T00:10:00.000Z');

  return {
    id: 'summary_123',
    pullRequestId: 'pr_123',
    source: 'github_review',
    summary: 'Codex sinalizou 2 achados no pull request.',
    blockersCount: 1,
    suggestionsCount: 1,
    risksCount: 2,
    rawContent: '[src/app.ts]\n[P1] Corrigir validacao',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

describe('PrismaCodexReviewSummaryRepository', () => {
  it('should create and map a codex review summary record', async () => {
    const create = vi.fn().mockResolvedValue(buildRecord());
    const upsert = vi.fn();
    const findUnique = vi.fn();
    const repository = new PrismaCodexReviewSummaryRepository({
      create,
      upsert,
      findUnique,
      findMany: vi.fn(),
    });

    await expect(
      repository.create({
        pullRequestId: 'pr_123',
        source: 'github_review',
        summary: 'Codex sinalizou 2 achados no pull request.',
        blockersCount: 1,
        suggestionsCount: 1,
        risksCount: 2,
        rawContent: '[src/app.ts]\n[P1] Corrigir validacao',
      }),
    ).resolves.toEqual(buildRecord());

    expect(create).toHaveBeenCalledWith({
      data: {
        pullRequestId: 'pr_123',
        source: 'github_review',
        summary: 'Codex sinalizou 2 achados no pull request.',
        blockersCount: 1,
        suggestionsCount: 1,
        risksCount: 2,
        rawContent: '[src/app.ts]\n[P1] Corrigir validacao',
      },
    });
  });

  it('should find a codex review summary by pull request id', async () => {
    const create = vi.fn();
    const upsert = vi.fn();
    const findUnique = vi.fn().mockResolvedValue(buildRecord());
    const repository = new PrismaCodexReviewSummaryRepository({
      create,
      upsert,
      findUnique,
      findMany: vi.fn(),
    });

    await expect(repository.findByPullRequestId('pr_123')).resolves.toEqual(
      buildRecord(),
    );

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        pullRequestId: 'pr_123',
      },
    });
  });

  it('should translate unique constraint errors into a domain conflict', async () => {
    const create = vi.fn().mockRejectedValue({ code: 'P2002' });
    const upsert = vi.fn();
    const findUnique = vi.fn();
    const repository = new PrismaCodexReviewSummaryRepository({
      create,
      upsert,
      findUnique,
      findMany: vi.fn(),
    });

    await expect(
      repository.create({
        pullRequestId: 'pr_123',
        source: 'github_review',
        summary: 'Codex sinalizou 2 achados no pull request.',
        blockersCount: 1,
        suggestionsCount: 1,
        risksCount: 2,
        rawContent: '[src/app.ts]\n[P1] Corrigir validacao',
      }),
    ).rejects.toBeInstanceOf(CodexReviewSummaryAlreadyExistsError);
  });

  it('should upsert codex review summaries by pull request id', async () => {
    const create = vi.fn();
    const upsert = vi.fn().mockResolvedValue(
      buildRecord({
        summary: 'Codex sinalizou 3 achados no pull request.',
        blockersCount: 2,
        suggestionsCount: 1,
        risksCount: 3,
      }),
    );
    const findUnique = vi.fn();
    const repository = new PrismaCodexReviewSummaryRepository({
      create,
      upsert,
      findUnique,
      findMany: vi.fn(),
    });

    await expect(
      repository.upsert({
        pullRequestId: 'pr_123',
        source: 'github_review',
        summary: 'Codex sinalizou 3 achados no pull request.',
        blockersCount: 2,
        suggestionsCount: 1,
        risksCount: 3,
        rawContent: '[src/app.ts]\n[P1] Corrigir validacao\n\n---\n\n[src/lib.ts]\n[P2] Simplificar teste',
      }),
    ).resolves.toEqual(
      buildRecord({
        summary: 'Codex sinalizou 3 achados no pull request.',
        blockersCount: 2,
        suggestionsCount: 1,
        risksCount: 3,
      }),
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        pullRequestId: 'pr_123',
      },
      create: {
        pullRequestId: 'pr_123',
        source: 'github_review',
        summary: 'Codex sinalizou 3 achados no pull request.',
        blockersCount: 2,
        suggestionsCount: 1,
        risksCount: 3,
        rawContent: '[src/app.ts]\n[P1] Corrigir validacao\n\n---\n\n[src/lib.ts]\n[P2] Simplificar teste',
      },
      update: {
        source: 'github_review',
        summary: 'Codex sinalizou 3 achados no pull request.',
        blockersCount: 2,
        suggestionsCount: 1,
        risksCount: 3,
        rawContent: '[src/app.ts]\n[P1] Corrigir validacao\n\n---\n\n[src/lib.ts]\n[P2] Simplificar teste',
      },
    });
  });

  it('should list codex review summaries by repository ordered by recency', async () => {
    const create = vi.fn();
    const upsert = vi.fn();
    const findUnique = vi.fn();
    const findMany = vi.fn().mockResolvedValue([buildRecord()]);
    const repository = new PrismaCodexReviewSummaryRepository({
      create,
      upsert,
      findUnique,
      findMany,
    });

    await expect(repository.listByRepositoryId('repo_123')).resolves.toEqual([
      buildRecord(),
    ]);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        pullRequest: {
          repositoryId: 'repo_123',
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  });
});
