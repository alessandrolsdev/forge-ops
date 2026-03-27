import type { CreateRepositoryInput, Repository } from './repository.entity.js';

export interface RepositoryRepository {
  create(input: CreateRepositoryInput): Promise<Repository>;
  list(): Promise<Repository[]>;
}
