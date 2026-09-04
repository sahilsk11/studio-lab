import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

const ACCESS_JWT_HEADER = 'cf-access-jwt-assertion';

export interface CloudflareAccessConfig {
  audience: string;
  issuer: string;
}

export type CloudflareAccessIdentity = JWTPayload & {
  email?: string;
  type: 'app';
};

export interface CloudflareAccessVerifier {
  verify(headers: Record<string, string | string[] | undefined>): Promise<CloudflareAccessIdentity>;
}

export class CloudflareAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudflareAccessError';
  }
}

export function loadCloudflareAccessConfig(env: NodeJS.ProcessEnv): CloudflareAccessConfig | null {
  const audience = env.CLOUDFLARE_ACCESS_AUD?.trim();
  const teamDomain = env.CLOUDFLARE_ACCESS_TEAM_DOMAIN?.trim();
  const required = env.NODE_ENV === 'production' || Boolean(audience || teamDomain);

  if (!required) return null;
  if (!audience || !teamDomain) {
    throw new Error(
      'CLOUDFLARE_ACCESS_AUD and CLOUDFLARE_ACCESS_TEAM_DOMAIN are required in production',
    );
  }

  const issuerUrl = new URL(teamDomain.includes('://') ? teamDomain : `https://${teamDomain}`);
  if (
    issuerUrl.protocol !== 'https:' ||
    !issuerUrl.hostname.endsWith('.cloudflareaccess.com') ||
    issuerUrl.username ||
    issuerUrl.password ||
    issuerUrl.pathname !== '/' ||
    issuerUrl.search ||
    issuerUrl.hash
  ) {
    throw new Error('CLOUDFLARE_ACCESS_TEAM_DOMAIN must be an HTTPS origin without a path');
  }

  return { audience, issuer: issuerUrl.origin };
}

export function createCloudflareAccessVerifier(
  config: CloudflareAccessConfig,
  keySet: JWTVerifyGetKey = createRemoteJWKSet(
    new URL('/cdn-cgi/access/certs', `${config.issuer}/`),
  ),
): CloudflareAccessVerifier {
  return {
    async verify(headers) {
      const header = headers[ACCESS_JWT_HEADER];
      const token = Array.isArray(header) ? header[0] : header;
      if (!token) throw new CloudflareAccessError('missing Cloudflare Access token');

      try {
        const { payload } = await jwtVerify(token, keySet, {
          algorithms: ['RS256'],
          audience: config.audience,
          issuer: config.issuer,
        });
        if (payload.type !== 'app') {
          throw new CloudflareAccessError('invalid Cloudflare Access token type');
        }
        return payload as CloudflareAccessIdentity;
      } catch (error) {
        if (error instanceof CloudflareAccessError) throw error;
        throw new CloudflareAccessError('invalid Cloudflare Access token');
      }
    },
  };
}
