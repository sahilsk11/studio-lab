import { describe, expect, it } from 'vitest';

import { accessJwtFromCookie, accessJwtFromRequest } from './access-jwt.ts';

describe('accessJwtFromCookie', () => {
  it('reads the Cloudflare Access cookie', () => {
    expect(accessJwtFromCookie('theme=dark; CF_Authorization=abc.def.ghi; other=1')).toBe(
      'abc.def.ghi',
    );
  });

  it('decodes a percent-encoded cookie value', () => {
    expect(accessJwtFromCookie('CF_Authorization=abc%2Edef')).toBe('abc.def');
  });

  it('returns null when the cookie is missing', () => {
    expect(accessJwtFromCookie(null)).toBeNull();
    expect(accessJwtFromCookie('theme=dark')).toBeNull();
  });
});

describe('accessJwtFromRequest', () => {
  it('prefers the Access assertion header', () => {
    const request = new Request('https://studiolab.ultron.sh/api/project', {
      headers: {
        'cf-access-jwt-assertion': 'header-jwt',
        cookie: 'CF_Authorization=cookie-jwt',
      },
    });
    expect(accessJwtFromRequest(request)).toBe('header-jwt');
  });

  it('falls back to the Access cookie', () => {
    const request = new Request('https://studiolab.ultron.sh/api/project', {
      headers: { cookie: 'CF_Authorization=cookie-jwt' },
    });
    expect(accessJwtFromRequest(request)).toBe('cookie-jwt');
  });
});
