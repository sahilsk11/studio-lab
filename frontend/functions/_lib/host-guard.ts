export function isPagesDevHost(hostname: string): boolean {
  return hostname.toLowerCase().endsWith('.pages.dev');
}

export function pagesDevRedirect(request: Request, canonicalHost: string): Response | null {
  const url = new URL(request.url);
  if (!isPagesDevHost(url.hostname)) return null;

  url.hostname = canonicalHost;
  return Response.redirect(url.toString(), 308);
}
