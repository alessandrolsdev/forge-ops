import { ApplicationError } from '../../shared/errors/application-error.js';

export class RepositoryAlreadyExistsError extends ApplicationError {
  constructor(message = 'Repository is already registered.') {
    super(message, 409, 'repository_already_exists');
  }
}
