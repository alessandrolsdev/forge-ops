import type { FastifyBaseLogger, FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ApplicationError } from '../../shared/errors/application-error.js';

interface ErrorPayload {
  error: {
    code: string;
    message: string;
  };
}

const buildValidationPayload = (error: ZodError): ErrorPayload => ({
  error: {
    code: 'validation_error',
    message: error.issues.map((issue) => issue.message).join('; '),
  },
});

export const createErrorHandler =
  (logger: FastifyBaseLogger) =>
  (
    error: FastifyError | ApplicationError | ZodError,
    request: FastifyRequest,
    reply: FastifyReply,
  ): void => {
    if (error instanceof ZodError) {
      reply.status(400).send(buildValidationPayload(error));
      return;
    }

    if (error instanceof ApplicationError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      } satisfies ErrorPayload);
      return;
    }

    logger.error(
      {
        err: error,
        method: request.method,
        url: request.url,
      },
      'Unhandled request error',
    );

    reply.status(500).send({
      error: {
        code: 'internal_server_error',
        message: 'An unexpected error occurred.',
      },
    } satisfies ErrorPayload);
  };

