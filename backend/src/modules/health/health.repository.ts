export interface HealthRecord {
  status: 'ok';
  service: 'forgeops-backend';
  timestamp: string;
  environment: 'development' | 'test' | 'production';
}

export interface HealthRepository {
  getBaseHealthSnapshot(): HealthRecord;
}

interface StaticHealthRepositoryOptions {
  environment: 'development' | 'test' | 'production';
  now?: () => Date;
}

export class StaticHealthRepository implements HealthRepository {
  private readonly environment: StaticHealthRepositoryOptions['environment'];
  private readonly now: () => Date;

  public constructor(options: StaticHealthRepositoryOptions) {
    this.environment = options.environment;
    this.now = options.now ?? (() => new Date());
  }

  public getBaseHealthSnapshot(): HealthRecord {
    return {
      status: 'ok',
      service: 'forgeops-backend',
      timestamp: this.now().toISOString(),
      environment: this.environment,
    };
  }
}
