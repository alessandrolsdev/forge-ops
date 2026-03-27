import 'fastify';
import type { OperatorPrincipal } from '../shared/auth/operator-principal.js';

export type ForgeOpsRouteAccess = 'public' | 'protected';

declare module 'fastify' {
  interface FastifyContextConfig {
    access?: ForgeOpsRouteAccess;
  }

  interface FastifyRequest {
    operatorPrincipal: OperatorPrincipal | null;
  }
}

export {};
