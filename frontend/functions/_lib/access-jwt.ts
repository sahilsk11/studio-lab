const ACCESS_JWT_HEADER = 'cf-access-jwt-assertion';
const ACCESS_COOKIE = 'CF_Authorization';

export function accessJwtFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) !== ACCESS_COOKIE) continue;

    const value = trimmed.slice(eq + 1).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

export function accessJwtFromRequest(request: Request): string | null {
  const header = request.headers.get(ACCESS_JWT_HEADER)?.trim();
  if (header) return header;
  return accessJwtFromCookie(request.headers.get('cookie'));
}
