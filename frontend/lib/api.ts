import type { ImageKind, Project, ProjectSummary } from '@/types/project';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
export const DEFAULT_API_URL =
  configuredApiUrl !== undefined ? configuredApiUrl : 'http://localhost:3001';

const LOCAL_API_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

function isDeployedHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host.endsWith('.ultron.sh') || host.endsWith('.pages.dev');
}

/** Ignore dev-only API URLs when the SPA is served from production. */
export function normalizeApiUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_API_URL;
  if (isDeployedHost() && LOCAL_API_PATTERN.test(trimmed)) return DEFAULT_API_URL;
  return trimmed;
}

let apiBaseUrl = DEFAULT_API_URL;
let authTokenGetter: (() => Promise<string | null>) | null = null;
let anonymousSessionGetter: (() => Promise<string | null>) | null = null;

export function setApiBaseUrl(url: string): void {
  apiBaseUrl = normalizeApiUrl(url);
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function setAuthTokenGetter(getter: (() => Promise<string | null>) | null): void {
  authTokenGetter = getter;
}

export function setAnonymousSessionGetter(getter: (() => Promise<string | null>) | null): void {
  anonymousSessionGetter = getter;
}

export function resolveMediaUrl(uri?: string): string | undefined {
  if (!uri) return undefined;
  if (/^(data:|https?:|file:|blob:)/i.test(uri)) return uri;
  const path = uri.startsWith('/') ? uri : `/${uri}`;
  return `${apiBaseUrl}${path}`;
}

export function withMediaUrls(project: Project): Project {
  const abs = (uri?: string) => resolveMediaUrl(uri);
  return {
    ...project,
    videoPosterUri: abs(project.videoPosterUri),
    videoUri: abs(project.videoUri),
    people: project.people.map((item) => ({ ...item, imageUri: abs(item.imageUri) })),
    things: project.things.map((item) => ({ ...item, imageUri: abs(item.imageUri) })),
    scenes: project.scenes.map((item) => ({ ...item, imageUri: abs(item.imageUri) })),
    frames: project.frames.map((item) => ({ ...item, imageUri: abs(item.imageUri) })),
  };
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = authTokenGetter ? await authTokenGetter() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  const sessionId = anonymousSessionGetter ? await anonymousSessionGetter() : null;
  if (sessionId) headers['X-Anonymous-Session'] = sessionId;
  return headers;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers = await authHeaders();
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${apiBaseUrl}${path}`, {
    method,
    credentials: 'include',
    headers: Object.keys(headers).length ? headers : undefined,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data: { error?: string; message?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error(res.ok ? 'Invalid server response' : `Request failed (${res.status})`);
  }
  if (!res.ok) {
    const err = new Error(data.error ?? data.message ?? `Request failed (${res.status})`) as Error & {
      code?: string;
      status?: number;
    };
    err.code = data.error;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

async function projectCall(method: string, path: string, body?: unknown): Promise<Project> {
  const data = await request<{ project: Project }>(method, path, body);
  return withMediaUrls(data.project);
}

function projectUrl(projectId: string, suffix = ''): string {
  return `/api/projects/${projectId}${suffix}`;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const data = await request<{ projects: ProjectSummary[] }>('GET', '/api/projects');
  return data.projects;
}

export async function createRemoteProject(input: {
  idea: string;
  style: string;
  durationSec: number;
}): Promise<Project> {
  return projectCall('POST', '/api/projects', input);
}

export async function fetchProject(projectId: string): Promise<Project> {
  return projectCall('GET', projectUrl(projectId));
}

export async function updateProject(
  projectId: string,
  patch: {
    idea?: string;
    style?: string;
    durationSec?: number;
  },
): Promise<Project> {
  return projectCall('PATCH', projectUrl(projectId), patch);
}

export async function resetRemoteProject(
  projectId: string,
  defaults: {
    style: string;
    durationSec: number;
  },
): Promise<Project> {
  return projectCall('POST', projectUrl(projectId, '/reset'), defaults);
}

export async function createCast(
  projectId: string,
  input: {
    idea: string;
    style: string;
    durationSec: number;
  },
): Promise<Project> {
  return projectCall('POST', projectUrl(projectId, '/cast'), input);
}

export async function createScenes(projectId: string): Promise<Project> {
  return projectCall('POST', projectUrl(projectId, '/scenes'));
}

export async function createFrames(projectId: string): Promise<Project> {
  return projectCall('POST', projectUrl(projectId, '/frames'));
}

export async function generateItemImage(
  projectId: string,
  input: {
    kind: ImageKind;
    id: string;
  },
): Promise<Project> {
  return projectCall('POST', projectUrl(projectId, '/images'), input);
}

export async function createVideo(projectId: string): Promise<Project> {
  return projectCall('POST', projectUrl(projectId, '/video'));
}

export async function patchItem(
  projectId: string,
  input: {
    kind: ImageKind;
    id: string;
    name?: string;
    role?: string;
    look?: string;
    title?: string;
    action?: string;
    camera?: string;
  },
): Promise<Project> {
  return projectCall('PATCH', projectUrl(projectId, '/item'), input);
}

export async function deleteItem(
  projectId: string,
  input: { kind: ImageKind; id: string },
): Promise<Project> {
  return projectCall('DELETE', projectUrl(projectId, '/item'), input);
}

export async function checkHealth(
  url: string = apiBaseUrl,
  timeoutMs = 5000,
): Promise<{ ok: boolean; hasKey: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${normalizeApiUrl(url)}/health`, {
      credentials: 'include',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
