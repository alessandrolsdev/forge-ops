import { PullRequestAlreadyExistsError } from './pull-request.errors.js';
import type {
  CreatePullRequestInput,
  PullRequest,
  PullRequestState,
} from './pull-request.entity.js';
import type { PullRequestRepository } from './pull-request.repository.js';

interface PullRequestRecord {
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

type PullRequestDelegate = {
  create(args: {
    data: {
      repositoryId: string;
      githubPrId: string;
      number: number;
      title: string;
      state: PullRequestState;
      author: string;
      baseBranch: string;
      headBranch: string;
    };
  }): Promise<PullRequestRecord>;
  upsert(args: {
    where: {
      repositoryId_githubPrId: {
        repositoryId: string;
        githubPrId: string;
      };
    };
    create: {
      repositoryId: string;
      githubPrId: string;
      number: number;
      title: string;
      state: PullRequestState;
      author: string;
      baseBranch: string;
      headBranch: string;
    };
    update: {
      number: number;
      title: string;
      state: PullRequestState;
      author: string;
      baseBranch: string;
      headBranch: string;
    };
  }): Promise<PullRequestRecord>;
  findMany(args: {
    where: {
      repositoryId: string;
    };
    orderBy: [{ number: 'asc' | 'desc' }, { createdAt: 'asc' | 'desc' }];
  }): Promise<PullRequestRecord[]>;
  findUnique(args: {
    where: {
      id: string;
    };
  }): Promise<PullRequestRecord | null>;
};

const isUniqueConstraintError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
};

const toPullRequest = (record: PullRequestRecord): PullRequest => {
  return {
    id: record.id,
    repositoryId: record.repositoryId,
    githubPrId: record.githubPrId,
    number: record.number,
    title: record.title,
    state: record.state,
    author: record.author,
    baseBranch: record.baseBranch,
    headBranch: record.headBranch,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export class PrismaPullRequestRepository implements PullRequestRepository {
  constructor(private readonly pullRequest: PullRequestDelegate) {}

  async create(input: CreatePullRequestInput): Promise<PullRequest> {
    try {
      const record = await this.pullRequest.create({
        data: {
          repositoryId: input.repositoryId,
          githubPrId: input.githubPrId,
          number: input.number,
          title: input.title,
          state: input.state,
          author: input.author,
          baseBranch: input.baseBranch,
          headBranch: input.headBranch,
        },
      });

      return toPullRequest(record);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new PullRequestAlreadyExistsError();
      }

      throw error;
    }
  }

  async upsert(input: CreatePullRequestInput): Promise<PullRequest> {
    const record = await this.pullRequest.upsert({
      where: {
        repositoryId_githubPrId: {
          repositoryId: input.repositoryId,
          githubPrId: input.githubPrId,
        },
      },
      create: {
        repositoryId: input.repositoryId,
        githubPrId: input.githubPrId,
        number: input.number,
        title: input.title,
        state: input.state,
        author: input.author,
        baseBranch: input.baseBranch,
        headBranch: input.headBranch,
      },
      update: {
        number: input.number,
        title: input.title,
        state: input.state,
        author: input.author,
        baseBranch: input.baseBranch,
        headBranch: input.headBranch,
      },
    });

    return toPullRequest(record);
  }

  async listByRepositoryId(repositoryId: string): Promise<PullRequest[]> {
    const records = await this.pullRequest.findMany({
      where: {
        repositoryId,
      },
      orderBy: [{ number: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map(toPullRequest);
  }

  async findById(id: string): Promise<PullRequest | null> {
    const record = await this.pullRequest.findUnique({
      where: {
        id,
      },
    });

    return record ? toPullRequest(record) : null;
  }
}
