import { ApplicationError } from './application-error.js';

export class AuthorizationError extends ApplicationError {
  constructor(message = 'You are not allowed to perform this action.') {
    super(message, 403, 'forbidden');
  }
}
