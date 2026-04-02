import type { Logger } from 'pino';
import { GitHubPullRequestReviewSyncError } from '../github/github-app.errors.js';
import type {
  GitHubAppBoundary,
  GitHubPullRequestReviewCommentDescriptor,
} from '../github/github-app.boundary.js';
import { RepositoryNotFoundError } from '../repository-registry/repository.errors.js';
import type { RepositoryRepository } from '../repository-registry/repository.repository.js';
import { PullRequestNotFoundError } from './pull-request.errors.js';
import type { PullRequest } from './pull-request.entity.js';
import type { PullRequestRepository } from './pull-request.repository.js';
import type { CodexReviewSummary } from './codex-review-summary.entity.js';
import type { CodexReviewSummaryRepository } from './codex-review-summary.repository.js';

type ServiceLogger = Pick<Logger, 'info' | 'error'>;

const noopLogger: ServiceLogger = {
  info: () => undefined,
  error: () => undefined,
};

export interface CodexReviewSummaryServiceOptions {
  repositoryRegistryRepository: RepositoryRepository;
  pullRequestRepository: PullRequestRepository;
  codexReviewSummaryRepository: CodexReviewSummaryRepository;
  githubBoundary: GitHubAppBoundary;
  logger?: ServiceLogger;
}

export class CodexReviewSummaryService {
  constructor(private readonly options: CodexReviewSummaryServiceOptions) {}

  async findByPullRequestId(
    pullRequestId: string,
  ): Promise<CodexReviewSummary | null> {
    const pullRequest = await this.options.pullRequestRepository.findById(
      pullRequestId,
    );

    if (!pullRequest) {
      throw new PullRequestNotFoundError();
    }

    return this.options.codexReviewSummaryRepository.findByPullRequestId(
      pullRequestId,
    );
  }

  async syncByPullRequestId(
    pullRequestId: string,
  ): Promise<CodexReviewSummary | null> {
    const pullRequest = await this.options.pullRequestRepository.findById(
      pullRequestId,
    );

    if (!pullRequest) {
      throw new PullRequestNotFoundError();
    }

    return this.syncByPullRequest(pullRequest);
  }

  async syncByPullRequest(
    pullRequest: PullRequest,
  ): Promise<CodexReviewSummary | null> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(
        pullRequest.repositoryId,
      );

    if (!repository) {
      throw new RepositoryNotFoundError();
    }

    try {
      const listPullRequestReviewComments =
        this.options.githubBoundary.listPullRequestReviewComments;

      if (!listPullRequestReviewComments) {
        throw new GitHubPullRequestReviewSyncError();
      }

      const comments = await listPullRequestReviewComments(
        {
          owner: repository.owner,
          name: repository.name,
        },
        pullRequest.number,
      );
      const codexComments = selectCodexComments(comments);

      if (codexComments.length === 0) {
        this.logger.info(
          {
            event: 'codex_review_summary_sync_skipped',
            pullRequestId: pullRequest.id,
            repositoryId: repository.id,
            githubPrNumber: pullRequest.number,
          },
          'Codex review summary sync skipped because no Codex review comments were found.',
        );

        return null;
      }

      const rawContent = codexComments
        .map((comment) => formatCommentForStorage(comment))
        .join('\n\n---\n\n');
      const blockersCount = countMatches(
        rawContent,
        /\[(?:p0|p1|alto|bloqueante)\]/gi,
      );
      const suggestionsCount = countMatches(
        rawContent,
        /\[(?:p2|p3|medio|baixo)\]/gi,
      );
      const risksCount = countMatches(
        rawContent,
        /\b(risco|regress|seguranca|boundary|tipagem|scope|escopo|teste)\b/gi,
      );
      const summary = buildSummary(codexComments);

      const persistedSummary =
        await this.options.codexReviewSummaryRepository.upsert({
          pullRequestId: pullRequest.id,
          source: 'github_review',
          summary,
          blockersCount,
          suggestionsCount,
          risksCount,
          rawContent,
        });

      this.logger.info(
        {
          event: 'codex_review_summary_sync_succeeded',
          pullRequestId: pullRequest.id,
          repositoryId: repository.id,
          githubPrNumber: pullRequest.number,
          codexCommentCount: codexComments.length,
        },
        'Codex review summary sync completed.',
      );

      return persistedSummary;
    } catch (error) {
      this.logger.error(
        {
          event: 'codex_review_summary_sync_failed',
          pullRequestId: pullRequest.id,
          repositoryId: pullRequest.repositoryId,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        },
        'Codex review summary sync failed.',
      );

      throw error;
    }
  }

  private get logger(): ServiceLogger {
    return this.options.logger ?? noopLogger;
  }
}

const selectCodexComments = (
  comments: GitHubPullRequestReviewCommentDescriptor[],
): GitHubPullRequestReviewCommentDescriptor[] => {
  return comments
    .filter((comment) => isCodexReviewer(comment.reviewerLogin))
    .filter((comment) => comment.body.trim().length > 0)
    .sort((left, right) => {
      const leftTime = left.createdAt?.getTime() ?? 0;
      const rightTime = right.createdAt?.getTime() ?? 0;

      return rightTime - leftTime;
    });
};

const isCodexReviewer = (reviewerLogin: string): boolean => {
  return reviewerLogin.toLowerCase().includes('codex');
};

const formatCommentForStorage = (
  comment: GitHubPullRequestReviewCommentDescriptor,
): string => {
  const pathPrefix = comment.path ? `[${comment.path}]` : '[unknown-file]';
  return `${pathPrefix}\n${comment.body.trim()}`;
};

const buildSummary = (
  comments: GitHubPullRequestReviewCommentDescriptor[],
): string => {
  const titles = comments
    .slice(0, 3)
    .map((comment) => extractHeadline(comment.body))
    .filter((headline) => headline.length > 0);

  if (titles.length === 0) {
    return `Codex sinalizou ${comments.length} achados no pull request.`;
  }

  return `Codex sinalizou ${comments.length} achados no pull request: ${titles.join(
    '; ',
  )}`;
};

const extractHeadline = (body: string): string => {
  const normalizedBody = body.replace(/\r\n/g, '\n').trim();
  const firstLine = normalizedBody.split('\n').find((line) => line.trim().length > 0);

  if (!firstLine) {
    return '';
  }

  return firstLine.trim().slice(0, 160);
};

const countMatches = (value: string, pattern: RegExp): number => {
  const matches = value.match(pattern);
  return matches ? matches.length : 0;
};
