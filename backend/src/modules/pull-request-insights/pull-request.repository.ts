import type {
  CreatePullRequestInput,
  PullRequest,
} from './pull-request.entity.js';

export interface PullRequestRepository {
  create(input: CreatePullRequestInput): Promise<PullRequest>;
  upsert(input: CreatePullRequestInput): Promise<PullRequest>;
  listByRepositoryId(repositoryId: string): Promise<PullRequest[]>;
  findById(id: string): Promise<PullRequest | null>;
}
