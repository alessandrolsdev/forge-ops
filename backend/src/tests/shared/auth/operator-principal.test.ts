import { describe, expect, it } from 'vitest';
import { createOperatorPrincipal } from '../../../shared/auth/operator-principal.js';

describe('createOperatorPrincipal', () => {
  it('should normalize optional fields and deduplicate capabilities', () => {
    expect(
      createOperatorPrincipal({
        subject: 'operator-123',
        email: ' TEAM@ForgeOps.dev ',
        displayName: ' ForgeOps Operator ',
        capabilities: ['repositories:write', 'repositories:read', 'repositories:write', ''],
      }),
    ).toEqual({
      kind: 'operator',
      subject: 'operator-123',
      email: 'team@forgeops.dev',
      displayName: 'ForgeOps Operator',
      capabilities: ['repositories:read', 'repositories:write'],
    });
  });

  it('should reject an empty subject', () => {
    expect(() =>
      createOperatorPrincipal({
        subject: '   ',
      }),
    ).toThrow(/must not be empty/);
  });
});
