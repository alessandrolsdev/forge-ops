import { RepositoryAlreadyExistsError } from './repository.errors.js';
import type { CreateRepositoryInput, Repository } from './repository.entity.js';
import type { RepositoryRepository } from './repository.repository.js';

interface RepositoryRecord {
  id: string;
  githubRepoId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type RepositoryDelegate = {
  create(args: {
    data: {
      githubRepoId: string;
      owner: string;
      name: string;
      fullName: string;
      defaultBranch: string;
      isActive: boolean;
    };
  }): Promise<RepositoryRecord>;
  findMany(args: {
    orderBy: {
      createdAt: 'asc' | 'desc';
    };
  }): Promise<RepositoryRecord[]>;
};

const isUniqueConstraintError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
};

const toRepository = (record: RepositoryRecord): Repository => {
  return {
    id: record.id,
    githubRepoId: record.githubRepoId,
    owner: record.owner,
    name: record.name,
    fullName: record.fullName,
    defaultBranch: record.defaultBranch,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export class PrismaRepositoryRepository implements RepositoryRepository {
  constructor(private readonly repository: RepositoryDelegate) {}

  async create(input: CreateRepositoryInput): Promise<Repository> {
    try {
      const record = await this.repository.create({
        data: {
          githubRepoId: input.githubRepoId,
          owner: input.owner,
          name: input.name,
          fullName: input.fullName,
          defaultBranch: input.defaultBranch,
          isActive: input.isActive ?? true,
        },
      });

      return toRepository(record);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new RepositoryAlreadyExistsError();
      }

      throw error;
    }
  }

  async list(): Promise<Repository[]> {
    const records = await this.repository.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return records.map(toRepository);
  }
}
