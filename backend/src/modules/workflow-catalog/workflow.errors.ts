import { ApplicationError } from '../../shared/errors/application-error.js';

export class WorkflowAlreadyExistsError extends ApplicationError {
  constructor(message = 'Workflow is already cataloged.') {
    super(message, 409, 'workflow_already_exists');
  }
}
