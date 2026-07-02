export type PolicyKey =
  | 'ci_workflow_present'
  | 'lint_workflow_present'
  | 'test_workflow_present'
  | 'automated_review_present'
  | 'reusable_workflow_present'
  | 'security_workflow_present';

export type PolicyCheckStatus = 'compliant' | 'non_compliant';

export interface PolicyCheck {
  id: string;
  repositoryId: string;
  policyKey: PolicyKey;
  status: PolicyCheckStatus;
  details: string;
  checkedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertPolicyCheckInput {
  repositoryId: string;
  policyKey: PolicyKey;
  status: PolicyCheckStatus;
  details: string;
  checkedAt: Date;
}
