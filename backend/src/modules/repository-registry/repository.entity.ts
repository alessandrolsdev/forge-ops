export interface Repository {
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

export interface CreateRepositoryInput {
  githubRepoId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isActive?: boolean;
}
