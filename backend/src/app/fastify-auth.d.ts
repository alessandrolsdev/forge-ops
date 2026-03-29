import 'fastify';
import type { OperatorPrincipal } from '../shared/auth/operator-principal.js';

export type ForgeOpsRouteAccess = 'public' | 'protected';
export type ForgeOpsRouteCapability =
  | 'repositories:read'
  | 'repositories:write';

declare module 'fastify' {
  interface FastifyContextConfig {
    access?: ForgeOpsRouteAccess;
    requiredCapability?: ForgeOpsRouteCapability;
  }

  interface FastifyRequest {
    operatorPrincipal: OperatorPrincipal | null;
  }
}

export {};
