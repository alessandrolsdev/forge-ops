import { ApplicationError } from './application-error.js';

export class ConfigurationError extends ApplicationError {
  public constructor(message: string, code = 'configuration_error') {
    super(message, 500, code);
  }
}

