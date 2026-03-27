import { ApplicationError } from './application-error.js';

export class AuthConfigurationError extends ApplicationError {
  constructor(message = 'Operator authentication is not configured.') {
    super(message, 503, 'auth_not_configured');
  }
}
