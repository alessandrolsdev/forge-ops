import type {
  PolicyCheckStatus,
  PolicyKey,
} from '../policy-engine/policy-check.entity.js';

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

export interface AutomationHealthScore {
  repositoryId: string;
  fullName: string;
  score: number;
  grade: AutomationHealthGrade;
  signals: AutomationHealthSignal[];
  ciReliability: AutomationHealthCiReliability;
  blockersPenalty: AutomationHealthBlockersPenalty;
  computedAt: Date;
}
