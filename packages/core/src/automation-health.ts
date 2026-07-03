import {
  evaluatePolicySignals,
  type PolicyCheckStatus,
  type PolicyKey,
  type PolicySignalWorkflow,
} from './policy-signals.js';

export type AutomationHealthGrade = 'healthy' | 'attention' | 'critical';

export const POLICY_SIGNAL_WEIGHTS: Record<PolicyKey, number> = {
  ci_workflow_present: 15,
  lint_workflow_present: 10,
  test_workflow_present: 15,
  automated_review_present: 15,
  reusable_workflow_present: 10,
  security_workflow_present: 10,
};

export const CI_RELIABILITY_WEIGHT = 25;
export const RECENT_RUN_SAMPLE_SIZE = 20;
export const BLOCKER_PENALTY_POINTS = 3;
export const MAX_BLOCKERS_PENALTY = 15;
export const HEALTHY_GRADE_THRESHOLD = 80;
export const ATTENTION_GRADE_THRESHOLD = 50;

const NON_INFORMATIVE_CONCLUSIONS = new Set(['skipped', 'neutral']);

export interface AutomationHealthSignal {
  policyKey: PolicyKey;
  status: PolicyCheckStatus;
  weight: number;
  earnedPoints: number;
  details: string;
}

export interface AutomationHealthCiReliability {
  weight: number;
  earnedPoints: number;
  consideredRunCount: number;
  successfulRunCount: number;
}

export interface AutomationHealthBlockersPenalty {
  openBlockersCount: number;
  penaltyPoints: number;
}

export interface ReviewedPullRequestInput {
  blockersCount: number;
  isOpen: boolean;
}

export interface AutomationHealthComputationInput {
  workflows: PolicySignalWorkflow[];
  recentRunConclusions: Array<string | null>;
  reviewedPullRequests: ReviewedPullRequestInput[];
}

export interface AutomationHealthComputation {
  score: number;
  grade: AutomationHealthGrade;
  signals: AutomationHealthSignal[];
  ciReliability: AutomationHealthCiReliability;
  blockersPenalty: AutomationHealthBlockersPenalty;
}

const toGrade = (score: number): AutomationHealthGrade => {
  if (score >= HEALTHY_GRADE_THRESHOLD) {
    return 'healthy';
  }

  if (score >= ATTENTION_GRADE_THRESHOLD) {
    return 'attention';
  }

  return 'critical';
};

const computeCiReliability = (
  recentRunConclusions: Array<string | null>,
): AutomationHealthCiReliability => {
  const consideredConclusions = recentRunConclusions.filter(
    (conclusion): conclusion is string =>
      conclusion !== null && !NON_INFORMATIVE_CONCLUSIONS.has(conclusion),
  );
  const successfulRunCount = consideredConclusions.filter(
    (conclusion) => conclusion === 'success',
  ).length;
  const earnedPoints =
    consideredConclusions.length === 0
      ? 0
      : Math.round(
          (CI_RELIABILITY_WEIGHT * successfulRunCount) /
            consideredConclusions.length,
        );

  return {
    weight: CI_RELIABILITY_WEIGHT,
    earnedPoints,
    consideredRunCount: consideredConclusions.length,
    successfulRunCount,
  };
};

const clampScore = (value: number): number => {
  return Math.min(100, Math.max(0, value));
};

export const computeAutomationHealthScore = (
  input: AutomationHealthComputationInput,
): AutomationHealthComputation => {
  const signals: AutomationHealthSignal[] = evaluatePolicySignals({
    workflows: input.workflows,
    reviewedPullRequestCount: input.reviewedPullRequests.length,
  }).map((signal) => {
    const weight = POLICY_SIGNAL_WEIGHTS[signal.policyKey];

    return {
      policyKey: signal.policyKey,
      status: signal.status,
      weight,
      earnedPoints: signal.status === 'compliant' ? weight : 0,
      details: signal.details,
    };
  });

  const ciReliability = computeCiReliability(input.recentRunConclusions);

  const openBlockersCount = input.reviewedPullRequests
    .filter((pullRequest) => pullRequest.isOpen)
    .reduce((total, pullRequest) => total + pullRequest.blockersCount, 0);
  const blockersPenalty: AutomationHealthBlockersPenalty = {
    openBlockersCount,
    penaltyPoints: Math.min(
      MAX_BLOCKERS_PENALTY,
      BLOCKER_PENALTY_POINTS * openBlockersCount,
    ),
  };

  const signalPoints = signals.reduce(
    (total, signal) => total + signal.earnedPoints,
    0,
  );
  const score = clampScore(
    signalPoints + ciReliability.earnedPoints - blockersPenalty.penaltyPoints,
  );

  return {
    score,
    grade: toGrade(score),
    signals,
    ciReliability,
    blockersPenalty,
  };
};
