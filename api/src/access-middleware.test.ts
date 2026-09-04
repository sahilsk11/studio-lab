import express from 'express';
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
  createCloudflareAccessVerifier,
  type CloudflareAccessConfig,
} from './cloudflare-access.js';

const config: CloudflareAccessConfig = {
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

async function accessToken() {
  return new SignJWT({ email: 'person@example.com', type: 'app' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setAudience(config.audience)
    .setIssuer(config.issuer)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

function createTestApp(verifier: ReturnType<typeof createCloudflareAccessVerifier> | null) {
  const app = express();
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use(async (req, res, next) => {
    if (!verifier) return next();
    try {
      await verifier.verify(req.headers);
      next();
    } catch {
      res.status(401).json({ error: 'unauthorized' });
    }
  });
  app.get('/api/projects', (_req, res) => {
    res.json({ projects: [] });
  });
  return app;
}

async function request(
  app: express.Express,
  path: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not bind test server'));
        return;
      }
      try {
        const res = await fetch(`http://127.0.0.1:${address.port}${path}`, { headers });
        const body = await res.json();
        resolve({ status: res.status, body });
      } finally {
        server.close();
      }
    });
  });
}

describe('Express Access middleware (fail-closed when enabled)', () => {
  it('skips Access checks when the verifier is not configured', async () => {
    const app = createTestApp(null);
    const result = await request(app, '/api/projects');
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ projects: [] });
  });

  it('allows /health without a JWT', async () => {
    const app = createTestApp(createCloudflareAccessVerifier(config, keySet));
    const result = await request(app, '/health');
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
  });

  it('rejects /api/* without a JWT', async () => {
    const app = createTestApp(createCloudflareAccessVerifier(config, keySet));
    const result = await request(app, '/api/projects');
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'unauthorized' });
  });

  it('allows /api/* with a valid JWT', async () => {
    const app = createTestApp(createCloudflareAccessVerifier(config, keySet));
    const result = await request(app, '/api/projects', {
      'cf-access-jwt-assertion': await accessToken(),
    });
    expect(result.status).toBe(200);
  });
});
