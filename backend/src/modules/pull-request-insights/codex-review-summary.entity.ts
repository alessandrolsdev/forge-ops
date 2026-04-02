export type CodexReviewSummarySource = 'github_review' | 'workflow_comment';

export interface CodexReviewSummary {
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

export interface UpsertCodexReviewSummaryInput {
  pullRequestId: string;
  source: CodexReviewSummarySource;
  summary: string;
  blockersCount: number;
  suggestionsCount: number;
  risksCount: number;
  rawContent: string;
}
