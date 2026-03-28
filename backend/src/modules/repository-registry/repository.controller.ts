import type { RouteGenericInterface } from 'fastify';
import { z } from 'zod';
import type { ForgeOpsFastifyInstance } from '../../app/register-routes.js';
import type {
  CreateRepositoryInput,
  Repository,
} from './repository.entity.js';
import type { RepositoryService } from './repository.service.js';

const createRepositoryBodySchema = z.object({
  githubRepoId: z.string().trim().min(1),
  owner: z.string().trim().min(1),
  name: z.string().trim().min(1),
  fullName: z.string().trim().min(1),
  defaultBranch: z.string().trim().min(1),
  isActive: z.boolean().optional(),
});

interface RepositoryResponse {
  id: string;
  githubRepoId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListRepositoriesRoute extends RouteGenericInterface {
  Reply: {
    repositories: RepositoryResponse[];
  };
}

interface CreateRepositoryRoute extends RouteGenericInterface {
  Body: CreateRepositoryInput;
  Reply: {
    repository: RepositoryResponse;
  };
}

const toRepositoryResponse = (repository: Repository): RepositoryResponse => {
  return {
    id: repository.id,
    githubRepoId: repository.githubRepoId,
    owner: repository.owner,
    name: repository.name,
    fullName: repository.fullName,
    defaultBranch: repository.defaultBranch,
    isActive: repository.isActive,
    createdAt: repository.createdAt.toISOString(),
    updatedAt: repository.updatedAt.toISOString(),
  };
};

export const registerRepositoryRegistryRoutes = (
  app: ForgeOpsFastifyInstance,
  repositoryService: RepositoryService,
): void => {
  app.get<ListRepositoriesRoute>(
    '/api/v1/repositories',
    {
      config: {
        access: 'protected',
      },
    },
    async () => {
      const repositories = await repositoryService.list();

      return {
        repositories: repositories.map(toRepositoryResponse),
      };
    },
  );

  app.post<CreateRepositoryRoute>(
    '/api/v1/repositories',
    {
      config: {
        access: 'protected',
      },
    },
    async (request, reply) => {
      const parsedInput = createRepositoryBodySchema.parse(request.body);
      const input: CreateRepositoryInput =
        typeof parsedInput.isActive === 'boolean'
          ? {
              githubRepoId: parsedInput.githubRepoId,
              owner: parsedInput.owner,
              name: parsedInput.name,
              fullName: parsedInput.fullName,
              defaultBranch: parsedInput.defaultBranch,
              isActive: parsedInput.isActive,
            }
          : {
              githubRepoId: parsedInput.githubRepoId,
              owner: parsedInput.owner,
              name: parsedInput.name,
              fullName: parsedInput.fullName,
              defaultBranch: parsedInput.defaultBranch,
            };
      const repository = await repositoryService.create(input);

      reply.status(201);

      return {
        repository: toRepositoryResponse(repository),
      };
    },
  );
};
