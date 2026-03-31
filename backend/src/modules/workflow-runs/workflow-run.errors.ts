import { ApplicationError } from '../../shared/errors/application-error.js';

export class WorkflowRunAlreadyExistsError extends ApplicationError {
  constructor(message = 'Workflow run is already synchronized.') {
    super(message, 409, 'workflow_run_already_exists');
  }
}

export class WorkflowJobAlreadyExistsError extends ApplicationError {
  constructor(message = 'Workflow job is already synchronized.') {
    super(message, 409, 'workflow_job_already_exists');
  }
}
