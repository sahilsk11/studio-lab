import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type CryptoKey,
  type JWTVerifyGetKey,
} from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  CloudflareAccessError,
  createCloudflareAccessVerifier,
  loadCloudflareAccessConfig,
} from './cloudflare-access.js';

const config = {
  audience: 'expected-audience',
  issuer: 'https://example.cloudflareaccess.com',
};

let privateKey: CryptoKey;
let keySet: JWTVerifyGetKey;

beforeAll(async () => {
  const keys = await generateKeyPair('RS256');
  privateKey = keys.privateKey;
  const publicJwk = await exportJWK(keys.publicKey);
  keySet = createLocalJWKSet({ keys: [{ ...publicJwk, alg: 'RS256', kid: 'test-key' }] });
});

async function accessToken(overrides: { audience?: string; issuer?: string; type?: string } = {}) {
  return new SignJWT({ email: 'person@example.com', type: overrides.type ?? 'app' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setAudience(overrides.audience ?? config.audience)
    .setIssuer(overrides.issuer ?? config.issuer)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

describe('Cloudflare Access configuration', () => {
  it('is optional outside production', () => {
    expect(loadCloudflareAccessConfig({ NODE_ENV: 'development' })).toBeNull();
  });

  it('is disabled when unset', () => {
    expect(loadCloudflareAccessConfig({ NODE_ENV: 'production' })).toBeNull();
  });

  it('requires both audience and team domain when partially configured', () => {
    expect(() =>
      loadCloudflareAccessConfig({
        NODE_ENV: 'production',
        CLOUDFLARE_ACCESS_AUD: config.audience,
      }),
    ).toThrow('CLOUDFLARE_ACCESS_AUD and CLOUDFLARE_ACCESS_TEAM_DOMAIN must both be set');
  });

  it('normalizes a bare team domain into an HTTPS issuer', () => {
    expect(
      loadCloudflareAccessConfig({
        CLOUDFLARE_ACCESS_AUD: config.audience,
        CLOUDFLARE_ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com',
      }),
    ).toEqual(config);
  });
});

describe('Cloudflare Access JWT verification', () => {
  it('accepts a correctly signed application token', async () => {
    const verifier = createCloudflareAccessVerifier(config, keySet);
    const identity = await verifier.verify({
      'cf-access-jwt-assertion': await accessToken(),
    });

    expect(identity.email).toBe('person@example.com');
  });

  it('rejects requests without a token', async () => {
    const verifier = createCloudflareAccessVerifier(config, keySet);

    await expect(verifier.verify({})).rejects.toThrow(CloudflareAccessError);
  });

  it('rejects a token issued for another Access application', async () => {
    const verifier = createCloudflareAccessVerifier(config, keySet);

    await expect(
      verifier.verify({ 'cf-access-jwt-assertion': await accessToken({ audience: 'other-app' }) }),
    ).rejects.toThrow(CloudflareAccessError);
  });

  it('rejects non-application tokens', async () => {
    const verifier = createCloudflareAccessVerifier(config, keySet);

    await expect(
      verifier.verify({ 'cf-access-jwt-assertion': await accessToken({ type: 'org' }) }),
    ).rejects.toThrow(CloudflareAccessError);
  });
});
