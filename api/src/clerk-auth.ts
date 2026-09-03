import { verifyToken } from '@clerk/backend';

export interface ClerkConfig {
  secretKey: string;
}

export type ClerkIdentity = {
  sub: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

export class ClerkAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClerkAuthError';
  }
}

export function loadClerkConfig(env: NodeJS.ProcessEnv): ClerkConfig | null {
  const secretKey = env.CLERK_SECRET_KEY?.trim();
  const required = env.NODE_ENV === 'production' || Boolean(secretKey);
  if (!required) return null;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required in production');
  }
  return { secretKey };
}

export function createClerkVerifier(config: ClerkConfig) {
  return {
    async verify(authorizationHeader: string | undefined): Promise<ClerkIdentity> {
      const token = extractBearer(authorizationHeader);
      if (!token) throw new ClerkAuthError('missing Clerk session token');

      try {
        const payload = await verifyToken(token, { secretKey: config.secretKey });
        const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
        if (!sub) throw new ClerkAuthError('invalid Clerk session token');

        return {
          sub,
          email: typeof payload.email === 'string' ? payload.email : undefined,
          firstName: typeof payload.first_name === 'string' ? payload.first_name : undefined,
          lastName: typeof payload.last_name === 'string' ? payload.last_name : undefined,
        };
      } catch (error) {
        if (error instanceof ClerkAuthError) throw error;
        throw new ClerkAuthError('invalid Clerk session token');
      }
    },
  };
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function bearerFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const raw = headers.authorization ?? headers.Authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value || undefined;
}

export function anonymousSessionFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const raw = headers['x-anonymous-session'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length > 128) return null;
  return trimmed;
}
