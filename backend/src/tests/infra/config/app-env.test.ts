import { describe, expect, it } from 'vitest';
import { loadAppEnv } from '../../../infra/config/app-env.js';

describe('loadAppEnv', () => {
  it('should apply defaults when optional values are missing', () => {
    expect(loadAppEnv({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3333,
      LOG_LEVEL: 'info',
    });
  });

  it('should reject invalid ports', () => {
    expect(() => loadAppEnv({ PORT: '0' })).toThrowError();
  });
});

