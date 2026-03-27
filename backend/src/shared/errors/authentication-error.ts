import { ApplicationError } from './application-error.js';

export class AuthenticationError extends ApplicationError {
  constructor(message = 'Authentication is required.') {
    super(message, 401, 'authentication_required');
  }
}
