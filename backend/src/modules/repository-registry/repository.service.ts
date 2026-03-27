import type {
  CreateRepositoryInput,
  Repository,
} from './repository.entity.js';
import type { RepositoryRepository } from './repository.repository.js';

export interface RepositoryServiceOptions {
  repository: RepositoryRepository;
}

export class RepositoryService {
  constructor(private readonly options: RepositoryServiceOptions) {}

  list(): Promise<Repository[]> {
    return this.options.repository.list();
  }

  create(input: CreateRepositoryInput): Promise<Repository> {
    return this.options.repository.create(input);
  }
}
