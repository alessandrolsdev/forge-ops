import type { OperatorPrincipal } from './operator-principal.js';

export interface VerifyOperatorAuthInput {
  token: string;
}

export interface OperatorAuthVerifier {
  verify(input: VerifyOperatorAuthInput): Promise<OperatorPrincipal>;
}
