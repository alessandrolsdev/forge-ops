import type { CreateSyncEventInput } from './sync-event.entity.js';

export interface SyncEventRecorder {
  record(input: CreateSyncEventInput): Promise<void>;
}

export const noopSyncEventRecorder: SyncEventRecorder = {
  record: async () => undefined,
};
