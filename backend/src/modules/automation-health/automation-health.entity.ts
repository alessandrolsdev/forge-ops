import type { AutomationHealthComputation } from '@forgeops/core';

export {
  ATTENTION_GRADE_THRESHOLD,
  BLOCKER_PENALTY_POINTS,
  CI_RELIABILITY_WEIGHT,
  HEALTHY_GRADE_THRESHOLD,
  MAX_BLOCKERS_PENALTY,
  POLICY_SIGNAL_WEIGHTS,
  RECENT_RUN_SAMPLE_SIZE,
} from '@forgeops/core';
export type {
  AutomationHealthBlockersPenalty,
  AutomationHealthCiReliability,
  AutomationHealthGrade,
  AutomationHealthSignal,
} from '@forgeops/core';

export interface AutomationHealthScore extends AutomationHealthComputation {
  repositoryId: string;
  fullName: string;
  computedAt: Date;
}
