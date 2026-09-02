import { proxyHealthRequest, type ApiProxyEnv } from './_lib/proxy-api.ts';

export async function onRequest(context: {
  request: Request;
  env: ApiProxyEnv;
}): Promise<Response> {
  return proxyHealthRequest(context.request, context.env);
}
