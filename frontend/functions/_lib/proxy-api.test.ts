import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiOriginFromEnv, proxyApiRequest, upstreamProxyUrl } from './proxy-api.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('upstreamProxyUrl', () => {
  it('maps same-origin /api paths onto the Fly origin', () => {
    expect(
      upstreamProxyUrl(
        'https://studiolab.ultron.sh/api/project?q=1',
        'https://studio-lab.fly.dev',
      )?.toString(),
    ).toBe('https://studio-lab.fly.dev/api/project?q=1');
  });

  it('maps same-origin /media paths onto the Fly origin', () => {
    expect(
      upstreamProxyUrl(
        'https://studiolab.ultron.sh/media/abc.png',
        'https://studio-lab.fly.dev',
      )?.toString(),
    ).toBe('https://studio-lab.fly.dev/media/abc.png');
  });

  it('rejects non-proxied paths', () => {
    expect(
      upstreamProxyUrl('https://studiolab.ultron.sh/index.html', 'https://studio-lab.fly.dev'),
    ).toBeNull();
  });
});

describe('apiOriginFromEnv', () => {
  it('defaults to the Fly app hostname', () => {
    expect(apiOriginFromEnv({})).toBe('https://studio-lab.fly.dev');
  });
});

describe('proxyApiRequest', () => {
  it('forwards the Access JWT and streams the Fly response', async () => {
    const fetchMock = vi.fn(async () => new Response('{"project":{}}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await proxyApiRequest(
      new Request('https://studiolab.ultron.sh/api/project', {
        headers: {
          accept: 'application/json',
          'cf-access-jwt-assertion': 'access-jwt',
        },
      }),
      {},
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ project: {} });
    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call as unknown as [URL, RequestInit];
    expect(url.toString()).toBe('https://studio-lab.fly.dev/api/project');
    const headers = new Headers(init.headers);
    expect(headers.get('cf-access-jwt-assertion')).toBe('access-jwt');
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('accept')).toBe('application/json');
  });

  it('forwards the Clerk Authorization header and anonymous session to Fly', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await proxyApiRequest(
      new Request('https://studiolab.ultron.sh/api/projects/abc/video', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: 'Bearer clerk-session',
          'x-anonymous-session': 'anon-1',
          'cf-access-jwt-assertion': 'access-jwt',
        },
      }),
      {},
    );

    expect(response.status).toBe(200);
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [, init] = call as unknown as [URL, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe('Bearer clerk-session');
    expect(headers.get('x-anonymous-session')).toBe('anon-1');
  });

  it('proxies without an Access token for public traffic', async () => {
    const fetchMock = vi.fn(async () => new Response('{"projects":[]}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await proxyApiRequest(
      new Request('https://studiolab.ultron.sh/api/projects'),
      {},
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ projects: [] });
    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [, init] = call as unknown as [URL, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('cf-access-jwt-assertion')).toBeNull();
  });
});
