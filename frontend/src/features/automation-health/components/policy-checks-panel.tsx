import { Button } from '@/components/ui/button';
import type { PolicyCheckItem } from '@/lib/api/client';

interface PolicyChecksPanelProps {
  policyChecks: PolicyCheckItem[];
  isEvaluating: boolean;
  onEvaluate: () => void;
}

const formatTimestamp = (value: string): string => new Date(value).toLocaleString();

export function PolicyChecksPanel({
  policyChecks,
  isEvaluating,
  onEvaluate,
}: PolicyChecksPanelProps) {
  return (
    <div className="policy-panel">
      <div className="policy-panel__actions">
        <Button onClick={onEvaluate} disabled={isEvaluating}>
          {isEvaluating ? 'Evaluating policies...' : 'Re-evaluate policies'}
        </Button>
      </div>
      {policyChecks.length === 0 ? (
        <p className="empty-state">
          No policy checks were persisted yet. Run an evaluation to compare this repository
          against the minimum automation standard.
        </p>
      ) : (
        <ul className="policy-list">
          {policyChecks.map((policyCheck) => (
            <li key={policyCheck.id} className="policy-list__item">
              <span
                className={
                  policyCheck.status === 'compliant'
                    ? 'policy-list__status policy-list__status--compliant'
                    : 'policy-list__status policy-list__status--non-compliant'
                }
              >
                {policyCheck.status === 'compliant' ? 'Compliant' : 'Non compliant'}
              </span>
              <div className="policy-list__body">
                <strong>{policyCheck.policyKey.replaceAll('_', ' ')}</strong>
                <span>{policyCheck.details}</span>
                <span className="policy-list__timestamp">
                  Checked at {formatTimestamp(policyCheck.checkedAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
