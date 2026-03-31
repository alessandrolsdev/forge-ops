import { ApplicationError } from '../../shared/errors/application-error.js';

export class WorkflowAlreadyExistsError extends ApplicationError {
  constructor(message = 'Workflow is already cataloged.') {
    super(message, 409, 'workflow_already_exists');
  }
}

export class WorkflowNotFoundError extends ApplicationError {
  constructor(message = 'Workflow was not found.') {
    super(message, 404, 'workflow_not_found');
  }
}
