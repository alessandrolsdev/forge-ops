import type { GitHubAppBoundary } from '../github/github-app.boundary.js';
import { RepositoryNotFoundError } from '../repository-registry/repository.errors.js';
import type { RepositoryRepository } from '../repository-registry/repository.repository.js';
import type { Workflow } from './workflow.entity.js';
import type { WorkflowRepository } from './workflow.repository.js';

export interface WorkflowServiceOptions {
  repositoryRegistryRepository: RepositoryRepository;
  workflowRepository: WorkflowRepository;
  githubBoundary: GitHubAppBoundary;
}

export class WorkflowService {
  constructor(private readonly options: WorkflowServiceOptions) {}

  listByRepositoryId(repositoryId: string): Promise<Workflow[]> {
    return this.options.workflowRepository.listByRepositoryId(repositoryId);
  }

  async syncByRepositoryId(repositoryId: string): Promise<Workflow[]> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      throw new RepositoryNotFoundError();
    }

    const remoteWorkflows = await this.options.githubBoundary.listRepositoryWorkflows({
      owner: repository.owner,
      name: repository.name,
    });

    await Promise.all(
      remoteWorkflows.map((workflow) =>
        this.options.workflowRepository.upsert({
          repositoryId: repository.id,
          githubWorkflowId: workflow.githubWorkflowId,
          name: workflow.name,
          path: workflow.path,
          state: workflow.state,
          sourceType: workflow.sourceType,
        }),
      ),
    );

    return this.options.workflowRepository.listByRepositoryId(repositoryId);
  }
}
