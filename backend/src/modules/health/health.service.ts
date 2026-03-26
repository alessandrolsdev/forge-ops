import type { HealthRepository } from './health.repository.js';

interface HealthServiceOptions {
  repository: HealthRepository;
}

export interface HealthSnapshot {
  status: 'ok';
  service: 'forgeops-backend';
  timestamp: string;
  environment: 'development' | 'test' | 'production';
}

export class HealthService {
  private readonly repository: HealthServiceOptions['repository'];

  public constructor(options: HealthServiceOptions) {
    this.repository = options.repository;
  }

  public getSnapshot(): HealthSnapshot {
    return this.repository.getBaseHealthSnapshot();
  }
}
