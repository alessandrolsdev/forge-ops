export type PullRequestState = 'open' | 'closed' | 'merged';

export interface PullRequest {
  id: string;
  repositoryId: string;
  githubPrId: string;
  number: number;
  title: string;
  state: PullRequestState;
  author: string;
  baseBranch: string;
  headBranch: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePullRequestInput {
  repositoryId: string;
  githubPrId: string;
  number: number;
  title: string;
  state: PullRequestState;
  author: string;
  baseBranch: string;
  headBranch: string;
}
