import { Button } from '@/components/ui/button';
import type { AutomationHealthScore } from '@/lib/api/client';

const gradeLabels: Record<AutomationHealthScore['grade'], string> = {
  healthy: 'Healthy',
  attention: 'Attention',
  critical: 'Critical',
};

interface HealthScoreCardProps {
  health: AutomationHealthScore;
  isSelected: boolean;
  onSelect: (repositoryId: string) => void;
}

export function HealthScoreCard({ health, isSelected, onSelect }: HealthScoreCardProps) {
  return (
    <article
      className={
        isSelected ? 'health-card health-card--selected' : 'health-card'
      }
      data-testid={`health-card-${health.repositoryId}`}
    >
      <header className="health-card__header">
        <strong className="health-card__name">{health.fullName}</strong>
        <span className={`health-badge health-badge--${health.grade}`}>
          {gradeLabels[health.grade]}
        </span>
      </header>
      <p className="health-card__score">
        <span className="health-card__score-value">{health.score}</span>
        <span className="health-card__score-max">/100</span>
      </p>
      <ul className="health-card__signals">
        {health.signals.map((signal) => (
          <li
            key={signal.policyKey}
            className={
              signal.status === 'compliant'
                ? 'health-signal health-signal--compliant'
                : 'health-signal health-signal--non-compliant'
            }
            title={signal.details}
          >
            <span className="health-signal__marker" aria-hidden="true">
              {signal.status === 'compliant' ? '✓' : '✕'}
            </span>
            <span className="health-signal__label">
              {signal.policyKey.replaceAll('_', ' ')}
            </span>
            <span className="health-signal__points">
              {signal.earnedPoints}/{signal.weight}
            </span>
          </li>
        ))}
      </ul>
      <p className="health-card__reliability">
        CI reliability: {health.ciReliability.earnedPoints}/{health.ciReliability.weight} (
        {health.ciReliability.successfulRunCount} of {health.ciReliability.consideredRunCount}{' '}
        recent runs succeeded)
      </p>
      {health.blockersPenalty.openBlockersCount > 0 ? (
        <p className="health-card__penalty">
          -{health.blockersPenalty.penaltyPoints} pts: {health.blockersPenalty.openBlockersCount}{' '}
          blocker(s) open in reviewed pull requests
        </p>
      ) : null}
      <Button
        variant={isSelected ? 'secondary' : 'primary'}
        onClick={() => onSelect(health.repositoryId)}
      >
        {isSelected ? 'Viewing details' : 'View details'}
      </Button>
    </article>
  );
}
