import { pagesDevRedirect } from './_lib/host-guard.ts';

interface MiddlewareEnv {
  CANONICAL_HOST?: string;
}

interface MiddlewareContext {
  request: Request;
  env: MiddlewareEnv;
  next: () => Promise<Response>;
}

export async function onRequest(context: MiddlewareContext): Promise<Response> {
  const canonical = context.env.CANONICAL_HOST?.trim() ?? 'studiolab.ultron.sh';
  const redirect = pagesDevRedirect(context.request, canonical);
  if (redirect) return redirect;
  return context.next();
}
