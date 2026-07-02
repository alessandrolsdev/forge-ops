import type {
  CreateSyncEventInput,
  SyncEvent,
  SyncEventStatus,
  SyncEventType,
} from './sync-event.entity.js';
import type { SyncEventRepository } from './sync-event.repository.js';

interface SyncEventRecord {
  id: string;
  repositoryId: string;
  type: SyncEventType;
  status: SyncEventStatus;
  details: string;
  createdAt: Date;
}

type SyncEventDelegate = {
  create(args: {
    data: {
      repositoryId: string;
      type: SyncEventType;
      status: SyncEventStatus;
      details: string;
    };
  }): Promise<SyncEventRecord>;
  findMany(args: {
    where: {
      repositoryId: string;
    };
    orderBy: Array<{
      createdAt?: 'asc' | 'desc';
    }>;
    take?: number;
  }): Promise<SyncEventRecord[]>;
};

const toSyncEvent = (record: SyncEventRecord): SyncEvent => {
  return {
    id: record.id,
    repositoryId: record.repositoryId,
    type: record.type,
    status: record.status,
    details: record.details,
    createdAt: record.createdAt,
  };
};

export class PrismaSyncEventRepository implements SyncEventRepository {
  constructor(private readonly syncEvent: SyncEventDelegate) {}

  async create(input: CreateSyncEventInput): Promise<SyncEvent> {
    const record = await this.syncEvent.create({
      data: {
        repositoryId: input.repositoryId,
        type: input.type,
        status: input.status,
        details: input.details,
      },
    });

    return toSyncEvent(record);
  }

  async listByRepositoryId(
    repositoryId: string,
    limit: number,
  ): Promise<SyncEvent[]> {
    const records = await this.syncEvent.findMany({
      where: {
        repositoryId,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
    });

    return records.map(toSyncEvent);
  }
}
