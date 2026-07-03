export {
  evaluatePolicySignals,
  type PolicyCheckStatus,
  type PolicyKey,
  type PolicySignalInput,
  type PolicySignalResult,
  type PolicySignalWorkflow,
  type WorkflowSourceType,
  type WorkflowState,
} from './policy-signals.js';
export {
  ATTENTION_GRADE_THRESHOLD,
  BLOCKER_PENALTY_POINTS,
  CI_RELIABILITY_WEIGHT,
  computeAutomationHealthScore,
  HEALTHY_GRADE_THRESHOLD,
  MAX_BLOCKERS_PENALTY,
  POLICY_SIGNAL_WEIGHTS,
  RECENT_RUN_SAMPLE_SIZE,
  type AutomationHealthBlockersPenalty,
  type AutomationHealthCiReliability,
  type AutomationHealthComputation,
  type AutomationHealthComputationInput,
  type AutomationHealthGrade,
  type AutomationHealthSignal,
  type ReviewedPullRequestInput,
} from './automation-health.js';
export { scanLocalWorkflows } from './workflow-scan.js';
