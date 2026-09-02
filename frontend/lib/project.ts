import { STEPS, type Frame, type Person, type Project, type Scene, type Step, type Thing } from '@/types/project';

export type ImageTarget = Person | Thing | Scene | Frame;

export function furthestStepIndex(project: Project): number {
  if (project.videoReady) return 4;
  if (project.frames.length > 0) return 3;
  if (project.scenes.length > 0) return 2;
  if (project.people.length > 0 || project.things.length > 0) return 1;
  return 0;
}

export function stepRoute(step: Step): string {
  switch (step) {
    case 'Idea':
      return '/';
    case 'Cast':
      return '/cast';
    case 'Scenes':
      return '/scenes';
    case 'Frames':
      return '/frames';
    case 'Video':
      return '/generate';
  }
}

export function canNavigateToStep(project: Project, step: Step): boolean {
  const target = STEPS.indexOf(step);
  return target <= furthestStepIndex(project);
}

export const IMAGE_CONCURRENCY = 4;

export async function runPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  if (!items.length) return;
  const queue = [...items];
  const n = Math.max(1, Math.min(limit, queue.length));
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) {
        const item = queue.shift();
        if (item === undefined) return;
        await fn(item);
      }
    }),
  );
}

export function needsImage(item: { imageStatus: string; imageStale?: boolean }): boolean {
  return (
    item.imageStatus === 'pending' ||
    item.imageStatus === 'error' ||
    item.imageStale === true
  );
}

export function imageProgress(items: ImageTarget[]) {
  const total = items.length;
  const done = items.filter((s) => s.imageStatus === 'done' && !s.imageStale).length;
  const stale = items.filter((s) => s.imageStale).length;
  const pending = items.filter((s) => s.imageStatus === 'pending').length;
  const errors = items.filter((s) => s.imageStatus === 'error').length;
  const generating = items.filter((s) => s.imageStatus === 'generating').length;
  return { total, done, stale, pending, errors, generating };
}

export function castItems(project: Project): ImageTarget[] {
  return [...project.people, ...project.things];
}

/** Previous-page locked sheets only — same-page items stay independent. */
export function refsForScene(project: Project, _scene: Scene): string[] {
  return collectUris(
    project,
    project.people.map((p) => p.id),
    project.things.map((t) => t.id),
  );
}

export function refsForFrame(project: Project, frame: Frame): string[] {
  const sceneUris: string[] = [];
  const primary = project.scenes.find((s) => s.id === frame.sceneId && s.imageStatus === 'done');
  if (primary?.imageUri) sceneUris.push(primary.imageUri);
  for (const scene of project.scenes) {
    if (scene.id === frame.sceneId || scene.imageStatus !== 'done' || !scene.imageUri) continue;
    sceneUris.push(scene.imageUri);
  }
  return [
    ...sceneUris,
    ...collectUris(
      project,
      project.people.map((p) => p.id),
      project.things.map((t) => t.id),
    ),
  ];
}

function collectUris(project: Project, peopleIds: string[], thingIds: string[]): string[] {
  const uris: string[] = [];
  for (const id of peopleIds) {
    const person = project.people.find((p) => p.id === id);
    if (person?.imageUri && person.imageStatus === 'done') uris.push(person.imageUri);
  }
  for (const id of thingIds) {
    const thing = project.things.find((t) => t.id === id);
    if (thing?.imageUri && thing.imageStatus === 'done') uris.push(thing.imageUri);
  }
  return uris;
}

export function withPendingImage<T extends object>(item: T): T & { imageStatus: 'pending' } {
  return { ...item, imageStatus: 'pending' };
}
