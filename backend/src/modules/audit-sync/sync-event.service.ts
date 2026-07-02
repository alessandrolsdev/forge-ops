import type { Logger } from 'pino';
import { RepositoryNotFoundError } from '../repository-registry/repository.errors.js';
import type { RepositoryRepository } from '../repository-registry/repository.repository.js';
import type { CreateSyncEventInput, SyncEvent } from './sync-event.entity.js';
import type { SyncEventRepository } from './sync-event.repository.js';
import type { SyncEventRecorder } from './sync-event.recorder.js';

type ServiceLogger = Pick<Logger, 'info' | 'error'>;

const noopLogger: ServiceLogger = {
  info: () => undefined,
  error: () => undefined,
};

const SYNC_EVENT_LIST_LIMIT = 50;

export interface SyncEventServiceOptions {
  repositoryRegistryRepository: RepositoryRepository;
  syncEventRepository: SyncEventRepository;
  logger?: ServiceLogger;
}

export class SyncEventService implements SyncEventRecorder {
  constructor(private readonly options: SyncEventServiceOptions) {}

  async record(input: CreateSyncEventInput): Promise<void> {
    try {
      await this.options.syncEventRepository.create(input);
    } catch (error) {
      this.logger.error(
        {
          event: 'sync_event_record_failed',
          repositoryId: input.repositoryId,
          syncEventType: input.type,
          syncEventStatus: input.status,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        },
        'Sync event could not be recorded; the originating sync is not affected.',
      );
    }
  }

  async listByRepositoryId(repositoryId: string): Promise<SyncEvent[]> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      throw new RepositoryNotFoundError();
    }

    return this.options.syncEventRepository.listByRepositoryId(
      repositoryId,
      SYNC_EVENT_LIST_LIMIT,
    );
  }

  private get logger(): ServiceLogger {
    return this.options.logger ?? noopLogger;
  }
}
