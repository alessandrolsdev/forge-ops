import type { GitHubAppBoundary } from '../github/github-app.boundary.js';
import type { HealthRepository } from './health.repository.js';

interface HealthServiceOptions {
  githubBoundary: GitHubAppBoundary;
  repository: HealthRepository;
}

export interface HealthSnapshot {
  status: 'ok';
  service: 'forgeops-backend';
  timestamp: string;
  environment: 'development' | 'test' | 'production';
  integrations: {
    github: ReturnType<GitHubAppBoundary['getStatus']>;
  };
}

export class HealthService {
  private readonly githubBoundary: HealthServiceOptions['githubBoundary'];
  private readonly repository: HealthServiceOptions['repository'];

  public constructor(options: HealthServiceOptions) {
    this.githubBoundary = options.githubBoundary;
    this.repository = options.repository;
  }

  public getSnapshot(): HealthSnapshot {
    const baseSnapshot = this.repository.getBaseHealthSnapshot();

    return {
      ...baseSnapshot,
      integrations: {
        github: this.githubBoundary.getStatus(),
      },
    };
  }
}
