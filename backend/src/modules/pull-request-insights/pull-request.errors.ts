import { ApplicationError } from '../../shared/errors/application-error.js';

export class PullRequestAlreadyExistsError extends ApplicationError {
  constructor(message = 'Pull request is already synchronized.') {
    super(message, 409, 'pull_request_already_exists');
  }
}

export class PullRequestNotFoundError extends ApplicationError {
  constructor(message = 'Pull request was not found.') {
    super(message, 404, 'pull_request_not_found');
  }
}
