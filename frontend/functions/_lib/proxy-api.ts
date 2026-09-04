import { accessJwtFromRequest } from './access-jwt.ts';

const DEFAULT_API_ORIGIN = 'https://studio-lab.fly.dev';
const JSON_HEADERS = { 'content-type': 'application/json' };

export interface ApiProxyEnv {
  API_ORIGIN?: string;
}

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: JSON_HEADERS });
}

export function apiOriginFromEnv(env: ApiProxyEnv): string {
  const origin = env.API_ORIGIN?.trim() || DEFAULT_API_ORIGIN;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

export function upstreamProxyUrl(requestUrl: string, apiOrigin: string): URL | null {
  const incoming = new URL(requestUrl);
  const { pathname } = incoming;
  if (
    pathname !== '/api' &&
    !pathname.startsWith('/api/') &&
    pathname !== '/media' &&
    !pathname.startsWith('/media/')
  ) {
    return null;
  }
  return new URL(`${apiOrigin}${pathname}${incoming.search}`);
}

function forwardedHeaders(request: Request, jwt: string): Headers {
  const headers = new Headers();
  const accept = request.headers.get('accept');
  if (accept) headers.set('accept', accept);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const range = request.headers.get('range');
  if (range) headers.set('range', range);
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('authorization', authorization);
  const anonymousSession = request.headers.get('x-anonymous-session');
  if (anonymousSession) headers.set('x-anonymous-session', anonymousSession);
  headers.set('cf-access-jwt-assertion', jwt);
  return headers;
}

export async function proxyApiRequest(request: Request, env: ApiProxyEnv): Promise<Response> {
  const upstream = upstreamProxyUrl(request.url, apiOriginFromEnv(env));
  if (!upstream) return jsonError(404, 'not found');

  const jwt = accessJwtFromRequest(request);
  if (!jwt) return jsonError(401, 'unauthorized');

  const method = request.method.toUpperCase();
  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers: forwardedHeaders(request, jwt),
    redirect: 'manual',
  };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  const upstreamRes = await fetch(upstream, init);
  const headers = new Headers(upstreamRes.headers);
  headers.delete('set-cookie');
  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers,
  });
}

export async function proxyHealthRequest(request: Request, env: ApiProxyEnv): Promise<Response> {
  const upstream = new URL(`${apiOriginFromEnv(env)}/health`);
  const upstreamRes = await fetch(upstream, {
    method: request.method.toUpperCase(),
    headers: { accept: request.headers.get('accept') ?? 'application/json' },
    redirect: 'manual',
  });
  const headers = new Headers(upstreamRes.headers);
  headers.delete('set-cookie');
  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers,
  });
}
