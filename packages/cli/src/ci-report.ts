import { appendFileSync, readFileSync } from 'node:fs';
import { HEALTH_COMMENT_MARKER } from './render.js';

interface GitHubIssueComment {
  id: number;
  body?: string;
}

export interface PublishCiReportOptions {
  markdown: string;
  fetcher?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}

export interface PublishCiReportResult {
  wroteSummary: boolean;
  commentAction: 'created' | 'updated' | 'skipped';
  note: string | null;
}

const resolvePullRequestNumber = (env: NodeJS.ProcessEnv): number | null => {
  if (!env.GITHUB_EVENT_PATH) {
    return null;
  }

  try {
    const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8')) as {
      pull_request?: { number?: number };
      issue?: { number?: number; pull_request?: unknown };
    };

    if (typeof event.pull_request?.number === 'number') {
      return event.pull_request.number;
    }

    if (event.issue?.pull_request && typeof event.issue.number === 'number') {
      return event.issue.number;
    }
  } catch {
    return null;
  }

  return null;
};

export const publishCiReport = async (
  options: PublishCiReportOptions,
): Promise<PublishCiReportResult> => {
  const env = options.env ?? process.env;
  const fetcher = options.fetcher ?? fetch;
  const result: PublishCiReportResult = {
    wroteSummary: false,
    commentAction: 'skipped',
    note: null,
  };

  if (env.GITHUB_STEP_SUMMARY) {
    appendFileSync(env.GITHUB_STEP_SUMMARY, `${options.markdown}\n`, 'utf8');
    result.wroteSummary = true;
  }

  const token = env.GITHUB_TOKEN ?? env.GH_TOKEN;
  const repository = env.GITHUB_REPOSITORY;
  const pullRequestNumber = resolvePullRequestNumber(env);

  if (!token || !repository || pullRequestNumber === null) {
    result.note =
      'Skipped the pull request comment: GITHUB_TOKEN, GITHUB_REPOSITORY, or a pull request event payload was not available.';
    return result;
  }

  const apiBase = env.GITHUB_API_URL ?? 'https://api.github.com';
  const headers = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-github-api-version': '2022-11-28',
  };
  const commentsUrl = `${apiBase}/repos/${repository}/issues/${pullRequestNumber}/comments`;

  const listResponse = await fetcher(`${commentsUrl}?per_page=100`, { headers });

  if (!listResponse.ok) {
    result.note = `Skipped the pull request comment: listing comments failed with status ${listResponse.status}.`;
    return result;
  }

  const comments = (await listResponse.json()) as GitHubIssueComment[];
  const existingComment = comments.find((comment) =>
    (comment.body ?? '').includes(HEALTH_COMMENT_MARKER),
  );

  if (existingComment) {
    const patchResponse = await fetcher(
      `${apiBase}/repos/${repository}/issues/comments/${existingComment.id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ body: options.markdown }),
      },
    );

    if (!patchResponse.ok) {
      result.note = `Skipped the pull request comment: updating failed with status ${patchResponse.status}.`;
      return result;
    }

    result.commentAction = 'updated';
    return result;
  }

  const postResponse = await fetcher(commentsUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ body: options.markdown }),
  });

  if (!postResponse.ok) {
    result.note = `Skipped the pull request comment: creating failed with status ${postResponse.status}.`;
    return result;
  }

  result.commentAction = 'created';
  return result;
};
