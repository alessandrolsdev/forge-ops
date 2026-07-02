import type {
  PolicyCheck,
  UpsertPolicyCheckInput,
} from './policy-check.entity.js';

export interface PolicyCheckRepository {
  upsert(input: UpsertPolicyCheckInput): Promise<PolicyCheck>;
  listByRepositoryId(repositoryId: string): Promise<PolicyCheck[]>;
}
