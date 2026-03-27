import { describe, expect, it } from 'vitest';
import { loadPersistenceEnv } from '../../../infra/config/persistence-env.js';

describe('loadPersistenceEnv', () => {
  it('should parse database and redis URLs', () => {
    expect(
      loadPersistenceEnv({
        DATABASE_URL: 'postgresql://forgeops:forgeops@localhost:5432/forgeops',
        REDIS_URL: 'redis://localhost:6379',
      }),
    ).toEqual({
      DATABASE_URL: 'postgresql://forgeops:forgeops@localhost:5432/forgeops',
      REDIS_URL: 'redis://localhost:6379',
    });
  });

  it('should reject invalid urls', () => {
    expect(() =>
      loadPersistenceEnv({
        DATABASE_URL: 'not-a-url',
        REDIS_URL: 'redis://localhost:6379',
      }),
    ).toThrowError();
  });
});

