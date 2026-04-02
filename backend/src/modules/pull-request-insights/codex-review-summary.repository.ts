import type {
  CodexReviewSummary,
  UpsertCodexReviewSummaryInput,
} from './codex-review-summary.entity.js';

export interface CodexReviewSummaryRepository {
  create(input: UpsertCodexReviewSummaryInput): Promise<CodexReviewSummary>;
  upsert(input: UpsertCodexReviewSummaryInput): Promise<CodexReviewSummary>;
  findByPullRequestId(pullRequestId: string): Promise<CodexReviewSummary | null>;
}
