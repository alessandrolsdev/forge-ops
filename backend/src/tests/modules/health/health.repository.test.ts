import { describe, expect, it } from 'vitest';
import { StaticHealthRepository } from '../../../modules/health/health.repository.js';

describe('StaticHealthRepository', () => {
  it('should return the base backend health snapshot', () => {
    const repository = new StaticHealthRepository({
      environment: 'test',
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(repository.getBaseHealthSnapshot()).toEqual({
      status: 'ok',
      service: 'forgeops-backend',
      timestamp: '2026-01-01T00:00:00.000Z',
      environment: 'test',
    });
  });
});
