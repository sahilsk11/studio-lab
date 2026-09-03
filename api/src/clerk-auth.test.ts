import { describe, expect, it } from 'vitest';

import {
  ClerkAuthError,
  anonymousSessionFromHeaders,
  bearerFromHeaders,
  createClerkVerifier,
  loadClerkConfig,
} from './clerk-auth.js';

describe('Clerk configuration', () => {
  it('is optional outside production', () => {
    expect(loadClerkConfig({ NODE_ENV: 'development' })).toBeNull();
    expect(loadClerkConfig({ NODE_ENV: 'test' })).toBeNull();
  });

  it('is required in production', () => {
    expect(() => loadClerkConfig({ NODE_ENV: 'production' })).toThrow(
      'CLERK_SECRET_KEY is required in production',
    );
  });

  it('loads a secret key when present', () => {
    expect(loadClerkConfig({ CLERK_SECRET_KEY: ' sk_test_abc ' })).toEqual({
      secretKey: 'sk_test_abc',
    });
  });
});

describe('Clerk session verification (fail-closed)', () => {
  const verifier = createClerkVerifier({ secretKey: 'sk_test_abc' });

  it('rejects requests without a Bearer token', async () => {
    await expect(verifier.verify(undefined)).rejects.toBeInstanceOf(ClerkAuthError);
    await expect(verifier.verify('Basic abc')).rejects.toThrow('missing Clerk session token');
  });

  it('reads the Authorization header from Express-style maps', () => {
    expect(bearerFromHeaders({ authorization: 'Bearer sess_123' })).toBe('Bearer sess_123');
    expect(bearerFromHeaders({ Authorization: ['Bearer sess_123'] })).toBe('Bearer sess_123');
    expect(bearerFromHeaders({})).toBeUndefined();
  });

  it('accepts a bounded anonymous session header', () => {
    expect(anonymousSessionFromHeaders({ 'x-anonymous-session': ' anon-1 ' })).toBe('anon-1');
    expect(anonymousSessionFromHeaders({ 'x-anonymous-session': 'x'.repeat(129) })).toBeNull();
    expect(anonymousSessionFromHeaders({})).toBeNull();
  });
});
