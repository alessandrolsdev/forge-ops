import 'fastify';
import type { OperatorPrincipal } from '../shared/auth/operator-principal.js';

declare module 'fastify' {
  interface FastifyRequest {
    operatorPrincipal: OperatorPrincipal | null;
  }
}

export {};
