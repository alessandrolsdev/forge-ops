import { ApplicationError } from '../../shared/errors/application-error.js';

export class CodexReviewSummaryAlreadyExistsError extends ApplicationError {
  constructor(message = 'Codex review summary is already synchronized.') {
    super(message, 409, 'codex_review_summary_already_exists');
  }
}
