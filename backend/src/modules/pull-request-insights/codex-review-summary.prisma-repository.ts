import { CodexReviewSummaryAlreadyExistsError } from './codex-review-summary.errors.js';
import type {
  CodexReviewSummary,
  CodexReviewSummarySource,
  UpsertCodexReviewSummaryInput,
} from './codex-review-summary.entity.js';
import type { CodexReviewSummaryRepository } from './codex-review-summary.repository.js';

interface CodexReviewSummaryRecord {
  id: string;
  pullRequestId: string;
  source: CodexReviewSummarySource;
  summary: string;
  blockersCount: number;
  suggestionsCount: number;
  risksCount: number;
  rawContent: string;
  createdAt: Date;
  updatedAt: Date;
}

type CodexReviewSummaryDelegate = {
  create(args: {
    data: {
      pullRequestId: string;
      source: CodexReviewSummarySource;
      summary: string;
      blockersCount: number;
      suggestionsCount: number;
      risksCount: number;
      rawContent: string;
    };
  }): Promise<CodexReviewSummaryRecord>;
  upsert(args: {
    where: {
      pullRequestId: string;
    };
    create: {
      pullRequestId: string;
      source: CodexReviewSummarySource;
      summary: string;
      blockersCount: number;
      suggestionsCount: number;
      risksCount: number;
      rawContent: string;
    };
    update: {
      source: CodexReviewSummarySource;
      summary: string;
      blockersCount: number;
      suggestionsCount: number;
      risksCount: number;
      rawContent: string;
    };
  }): Promise<CodexReviewSummaryRecord>;
  findUnique(args: {
    where: {
      pullRequestId: string;
    };
  }): Promise<CodexReviewSummaryRecord | null>;
};

const isUniqueConstraintError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
};

const toCodexReviewSummary = (
  record: CodexReviewSummaryRecord,
): CodexReviewSummary => {
  return {
    id: record.id,
    pullRequestId: record.pullRequestId,
    source: record.source,
    summary: record.summary,
    blockersCount: record.blockersCount,
    suggestionsCount: record.suggestionsCount,
    risksCount: record.risksCount,
    rawContent: record.rawContent,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export class PrismaCodexReviewSummaryRepository
  implements CodexReviewSummaryRepository
{
  constructor(
    private readonly codexReviewSummary: CodexReviewSummaryDelegate,
  ) {}

  async create(
    input: UpsertCodexReviewSummaryInput,
  ): Promise<CodexReviewSummary> {
    try {
      const record = await this.codexReviewSummary.create({
        data: {
          pullRequestId: input.pullRequestId,
          source: input.source,
          summary: input.summary,
          blockersCount: input.blockersCount,
          suggestionsCount: input.suggestionsCount,
          risksCount: input.risksCount,
          rawContent: input.rawContent,
        },
      });

      return toCodexReviewSummary(record);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new CodexReviewSummaryAlreadyExistsError();
      }

      throw error;
    }
  }

  async upsert(
    input: UpsertCodexReviewSummaryInput,
  ): Promise<CodexReviewSummary> {
    const record = await this.codexReviewSummary.upsert({
      where: {
        pullRequestId: input.pullRequestId,
      },
      create: {
        pullRequestId: input.pullRequestId,
        source: input.source,
        summary: input.summary,
        blockersCount: input.blockersCount,
        suggestionsCount: input.suggestionsCount,
        risksCount: input.risksCount,
        rawContent: input.rawContent,
      },
      update: {
        source: input.source,
        summary: input.summary,
        blockersCount: input.blockersCount,
        suggestionsCount: input.suggestionsCount,
        risksCount: input.risksCount,
        rawContent: input.rawContent,
      },
    });

    return toCodexReviewSummary(record);
  }

  async findByPullRequestId(
    pullRequestId: string,
  ): Promise<CodexReviewSummary | null> {
    const record = await this.codexReviewSummary.findUnique({
      where: {
        pullRequestId,
      },
    });

    return record ? toCodexReviewSummary(record) : null;
  }
}
