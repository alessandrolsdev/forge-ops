export type PolicyKey =
  | 'ci_workflow_present'
  | 'lint_workflow_present'
  | 'test_workflow_present'
  | 'automated_review_present'
  | 'reusable_workflow_present'
  | 'security_workflow_present';

export type PolicyCheckStatus = 'compliant' | 'non_compliant';

export type WorkflowState =
  | 'active'
  | 'deleted'
  | 'disabled_fork'
  | 'disabled_inactivity'
  | 'disabled_manually';

export type WorkflowSourceType = 'local' | 'reusable';

export interface PolicySignalWorkflow {
  name: string;
  path: string;
  state: WorkflowState;
  sourceType: WorkflowSourceType;
}

export interface PolicySignalInput {
  workflows: PolicySignalWorkflow[];
  reviewedPullRequestCount: number;
}

export interface PolicySignalResult {
  policyKey: PolicyKey;
  status: PolicyCheckStatus;
  details: string;
}

const REVIEW_WORKFLOW_KEYWORDS = ['codex', 'review'];
const SECURITY_WORKFLOW_KEYWORDS = ['security', 'codeql', 'audit', 'scan'];

const matchesAnyKeyword = (
  workflow: PolicySignalWorkflow,
  keywords: string[],
): boolean => {
  const name = workflow.name.toLowerCase();
  const path = workflow.path.toLowerCase();

  return keywords.some(
    (keyword) => name.includes(keyword) || path.includes(keyword),
  );
};

const toStatus = (isCompliant: boolean): PolicyCheckStatus => {
  return isCompliant ? 'compliant' : 'non_compliant';
};

export const evaluatePolicySignals = (
  input: PolicySignalInput,
): PolicySignalResult[] => {
  const activeWorkflows = input.workflows.filter(
    (workflow) => workflow.state === 'active',
  );
  const lintWorkflows = activeWorkflows.filter((workflow) =>
    matchesAnyKeyword(workflow, ['lint']),
  );
  const testWorkflows = activeWorkflows.filter((workflow) =>
    matchesAnyKeyword(workflow, ['test']),
  );
  const reviewWorkflows = activeWorkflows.filter((workflow) =>
    matchesAnyKeyword(workflow, REVIEW_WORKFLOW_KEYWORDS),
  );
  const reusableWorkflows = activeWorkflows.filter(
    (workflow) => workflow.sourceType === 'reusable',
  );
  const securityWorkflows = activeWorkflows.filter((workflow) =>
    matchesAnyKeyword(workflow, SECURITY_WORKFLOW_KEYWORDS),
  );
  const hasAutomatedReview =
    input.reviewedPullRequestCount > 0 || reviewWorkflows.length > 0;

  return [
    {
      policyKey: 'ci_workflow_present',
      status: toStatus(activeWorkflows.length > 0),
      details:
        activeWorkflows.length > 0
          ? `Found ${activeWorkflows.length} active workflow(s).`
          : 'No active workflows are registered for this repository.',
    },
    {
      policyKey: 'lint_workflow_present',
      status: toStatus(lintWorkflows.length > 0),
      details:
        lintWorkflows.length > 0
          ? `Found active lint workflow: ${lintWorkflows[0]!.name}.`
          : "No active workflow with 'lint' in its name or path.",
    },
    {
      policyKey: 'test_workflow_present',
      status: toStatus(testWorkflows.length > 0),
      details:
        testWorkflows.length > 0
          ? `Found active test workflow: ${testWorkflows[0]!.name}.`
          : "No active workflow with 'test' in its name or path.",
    },
    {
      policyKey: 'automated_review_present',
      status: toStatus(hasAutomatedReview),
      details: hasAutomatedReview
        ? input.reviewedPullRequestCount > 0
          ? `Found ${input.reviewedPullRequestCount} pull request(s) with automated review summaries.`
          : `Found active review workflow: ${reviewWorkflows[0]!.name}.`
        : 'No automated review workflow or reviewed pull requests found.',
    },
    {
      policyKey: 'reusable_workflow_present',
      status: toStatus(reusableWorkflows.length > 0),
      details:
        reusableWorkflows.length > 0
          ? `Found ${reusableWorkflows.length} reusable workflow(s).`
          : 'No reusable workflows are registered for this repository.',
    },
    {
      policyKey: 'security_workflow_present',
      status: toStatus(securityWorkflows.length > 0),
      details:
        securityWorkflows.length > 0
          ? `Found active security workflow: ${securityWorkflows[0]!.name}.`
          : "No active workflow matching 'security', 'codeql', 'audit' or 'scan'.",
    },
  ];
};
