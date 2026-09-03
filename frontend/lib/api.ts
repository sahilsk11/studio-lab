import type { ImageKind, Project, ProjectSummary } from '@/types/project';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
export const DEFAULT_API_URL =
  configuredApiUrl !== undefined ? configuredApiUrl : 'http://localhost:3001';

let apiBaseUrl = DEFAULT_API_URL;

export function setApiBaseUrl(url: string): void {
  apiBaseUrl = url.trim().replace(/\/+$/, '') || DEFAULT_API_URL;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
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
    const res = await fetch(`${url.trim().replace(/\/+$/, '')}/health`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
