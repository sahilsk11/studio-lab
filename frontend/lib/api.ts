import type { ImageKind, Project } from '@/types/project';

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

export async function fetchProject(): Promise<Project> {
  return projectCall('GET', '/api/project');
}

export async function updateProject(patch: {
  idea?: string;
  style?: string;
  durationSec?: number;
}): Promise<Project> {
  return projectCall('PATCH', '/api/project', patch);
}

export async function resetRemoteProject(defaults: {
  style: string;
  durationSec: number;
}): Promise<Project> {
  return projectCall('POST', '/api/project/reset', defaults);
}

export async function createCast(input: {
  idea: string;
  style: string;
  durationSec: number;
}): Promise<Project> {
  return projectCall('POST', '/api/cast', input);
}

export async function createScenes(): Promise<Project> {
  return projectCall('POST', '/api/scenes');
}

export async function createFrames(): Promise<Project> {
  return projectCall('POST', '/api/frames');
}

export async function generateItemImage(input: {
  kind: ImageKind;
  id: string;
}): Promise<Project> {
  return projectCall('POST', '/api/images', input);
}

export async function createVideo(): Promise<Project> {
  return projectCall('POST', '/api/video');
}

export async function patchItem(input: {
  kind: ImageKind;
  id: string;
  name?: string;
  role?: string;
  look?: string;
  title?: string;
  action?: string;
  camera?: string;
}): Promise<Project> {
  return projectCall('PATCH', '/api/item', input);
}

export async function deleteItem(input: { kind: ImageKind; id: string }): Promise<Project> {
  return projectCall('DELETE', '/api/item', input);
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
