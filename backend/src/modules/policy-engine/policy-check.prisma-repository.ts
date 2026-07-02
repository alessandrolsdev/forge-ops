import type {
  PolicyCheck,
  PolicyCheckStatus,
  PolicyKey,
  UpsertPolicyCheckInput,
} from './policy-check.entity.js';
import type { PolicyCheckRepository } from './policy-check.repository.js';

interface PolicyCheckRecord {
  id: string;
  repositoryId: string;
  policyKey: PolicyKey;
  status: PolicyCheckStatus;
  details: string;
  checkedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

type PolicyCheckDelegate = {
  upsert(args: {
    where: {
      repositoryId_policyKey: {
        repositoryId: string;
        policyKey: PolicyKey;
      };
    };
    create: {
      repositoryId: string;
      policyKey: PolicyKey;
      status: PolicyCheckStatus;
      details: string;
      checkedAt: Date;
    };
    update: {
      status: PolicyCheckStatus;
      details: string;
      checkedAt: Date;
    };
  }): Promise<PolicyCheckRecord>;
  findMany(args: {
    where: {
      repositoryId: string;
    };
    orderBy: Array<{
      policyKey?: 'asc' | 'desc';
    }>;
  }): Promise<PolicyCheckRecord[]>;
};

const toPolicyCheck = (record: PolicyCheckRecord): PolicyCheck => {
  return {
    id: record.id,
    repositoryId: record.repositoryId,
    policyKey: record.policyKey,
    status: record.status,
    details: record.details,
    checkedAt: record.checkedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export class PrismaPolicyCheckRepository implements PolicyCheckRepository {
  constructor(private readonly policyCheck: PolicyCheckDelegate) {}

  async upsert(input: UpsertPolicyCheckInput): Promise<PolicyCheck> {
    const record = await this.policyCheck.upsert({
      where: {
        repositoryId_policyKey: {
          repositoryId: input.repositoryId,
          policyKey: input.policyKey,
        },
      },
      create: {
        repositoryId: input.repositoryId,
        policyKey: input.policyKey,
        status: input.status,
        details: input.details,
        checkedAt: input.checkedAt,
      },
      update: {
        status: input.status,
        details: input.details,
        checkedAt: input.checkedAt,
      },
    });

    return toPolicyCheck(record);
  }

  async listByRepositoryId(repositoryId: string): Promise<PolicyCheck[]> {
    const records = await this.policyCheck.findMany({
      where: {
        repositoryId,
      },
      orderBy: [{ policyKey: 'asc' }],
    });

    return records.map(toPolicyCheck);
  }
}
