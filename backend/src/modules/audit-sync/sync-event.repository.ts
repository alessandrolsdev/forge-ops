import type { CreateSyncEventInput, SyncEvent } from './sync-event.entity.js';

export interface SyncEventRepository {
  create(input: CreateSyncEventInput): Promise<SyncEvent>;
  listByRepositoryId(repositoryId: string, limit: number): Promise<SyncEvent[]>;
}
