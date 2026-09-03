import { IMAGE_MAX_REFS, VIDEO_MAX_DURATION, VIDEO_MIN_DURATION } from './config.js';
import {
  generateCast,
  generateFrames,
  generateImage,
  generateProjectTitle,
  generateScenes,
  generateVideo,
} from './openrouter.js';
import { assembleImagePrompt, assembleVideoPrompt } from './prompts.js';
import { concatVideoFiles, readImageDataUri, saveImageFile, saveVideoFile } from './media.js';
import {
  createProject,
  getImagePath,
  loadProject,
  markGenerating,
  markImageDone,
  markImageError,
  markVideoError,
  markVideoProgress,
  markVideoReady,
  replaceCast,
  replaceFrames,
  replaceScenes,
  type ProjectOwner,
} from './store.js';
import type { Frame, ImageKind, Person, Project, Scene, Thing } from './types.js';

function toSubject(
  project: Project,
  kind: ImageKind,
  item: Person | Thing | Scene | Frame,
) {
  switch (kind) {
    case 'person': {
      const person = item as Person;
      return { type: 'person' as const, name: person.name, role: person.role, look: person.look };
    }
    case 'thing': {
      const thing = item as Thing;
      return { type: 'thing' as const, name: thing.name, look: thing.look, views: thing.views };
    }
    case 'scene': {
      const scene = item as Scene;
      return { type: 'scene' as const, title: scene.title, look: scene.look };
    }
    case 'frame': {
      const frame = item as Frame;
      const scene = project.scenes.find((s) => s.id === frame.sceneId);
      return {
        type: 'frame' as const,
        action: frame.action,
        camera: frame.camera,
        sceneTitle: scene?.title ?? '',
        sceneLook: scene?.look ?? '',
      };
    }
  }
}

function findItem(project: Project, kind: ImageKind, id: string) {
  switch (kind) {
    case 'person':
      return project.people.find((item) => item.id === id);
    case 'thing':
      return project.things.find((item) => item.id === id);
    case 'scene':
      return project.scenes.find((item) => item.id === id);
    case 'frame':
      return project.frames.find((item) => item.id === id);
  }
}

/**
 * Same-page sheets stay independent so they can render in parallel.
 * Only previous-page locked images are attached as references.
 */
function refUris(project: Project, kind: ImageKind, item: Person | Thing | Scene | Frame): string[] {
  const paths: string[] = [];
  const take = (k: ImageKind, id: string) => {
    const p = getImagePath(project.id, k, id);
    if (p) paths.push(p);
  };
  const takeAll = (k: ImageKind, ids: string[]) => {
    for (const id of ids) take(k, id);
  };

  if (kind === 'person' || kind === 'thing') return [];

  if (kind === 'scene') {
    takeAll(
      'person',
      project.people.map((p) => p.id),
    );
    takeAll(
      'thing',
      project.things.map((t) => t.id),
    );
  }

  if (kind === 'frame') {
    const frame = item as Frame;
    take('scene', frame.sceneId);
    for (const scene of project.scenes) {
      if (scene.id !== frame.sceneId) take('scene', scene.id);
    }
    takeAll(
      'person',
      project.people.map((p) => p.id),
    );
    takeAll(
      'thing',
      project.things.map((t) => t.id),
    );
  }

  return paths
    .map(readImageDataUri)
    .filter((uri): uri is string => Boolean(uri))
    .slice(0, IMAGE_MAX_REFS);
}

export function fallbackTitle(idea: string): string {
  const cleaned = idea.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Untitled reel';
  const title = cleaned.split(' ').slice(0, 6).join(' ');
  return title.length > 42 ? `${title.slice(0, 41).trim()}…` : title;
}

export async function runCreateProject(input: {
  owner: ProjectOwner;
  idea: string;
  style: string;
  durationSec: number;
}): Promise<Project> {
  let title = fallbackTitle(input.idea);
  let cost = 0;
  try {
    const named = await generateProjectTitle(input);
    const trimmed = named.title.trim().replace(/^["']|["']$/g, '');
    if (trimmed) title = trimmed;
    cost = named.cost;
  } catch {
    // No key, or the model failed — still create a visible named project.
  }
  return createProject({
    owner: input.owner,
    title,
    idea: input.idea,
    style: input.style,
    durationSec: input.durationSec,
    cost,
  });
}

export async function runCast(
  projectId: string,
  input: {
    idea: string;
    style: string;
    durationSec: number;
  },
): Promise<Project> {
  const result = await generateCast(input);
  return replaceCast(projectId, {
    styleNotes: result.styleNotes,
    idea: input.idea,
    style: input.style,
    durationSec: input.durationSec,
    people: result.people,
    things: result.things,
    cost: result.cost,
  });
}

export async function runScenes(projectId: string): Promise<Project> {
  const project = loadProject(projectId);
  const result = await generateScenes({
    idea: project.idea,
    style: project.style,
    styleNotes: project.styleNotes,
    durationSec: project.durationSec,
    people: project.people,
    things: project.things,
  });
  return replaceScenes(projectId, { scenes: result.scenes, cost: result.cost });
}

export async function runFrames(projectId: string): Promise<Project> {
  const project = loadProject(projectId);
  const result = await generateFrames({
    idea: project.idea,
    style: project.style,
    styleNotes: project.styleNotes,
    durationSec: project.durationSec,
    people: project.people,
    things: project.things,
    scenes: project.scenes,
  });
  return replaceFrames(projectId, { frames: result.frames, cost: result.cost });
}

export async function runImage(projectId: string, kind: ImageKind, id: string): Promise<Project> {
  const project = loadProject(projectId);
  const item = findItem(project, kind, id);
  if (!item) throw new Error(`${kind} ${id} not found`);

  markGenerating(projectId, kind, id);
  try {
    const refs = refUris(project, kind, item);
    const { prompt, aspectRatio } = assembleImagePrompt({
      idea: project.idea,
      style: project.style,
      styleNotes: project.styleNotes,
      people: project.people,
      things: project.things,
      scenes: kind === 'person' || kind === 'thing' ? undefined : project.scenes,
      subject: toSubject(project, kind, item),
      hasRefs: refs.length > 0,
    });
    const result = await generateImage({
      prompt,
      aspectRatio,
      referenceImages: refs.length ? refs : undefined,
    });
    const rel = saveImageFile(project.id, kind, id, result.base64, result.mediaType);
    markImageDone(projectId, kind, id, rel, result.cost);
    return loadProject(projectId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed';
    markImageError(projectId, kind, id, message);
    throw err;
  }
}

const videoInFlight = new Map<string, Promise<Project>>();

export async function runVideo(projectId: string): Promise<Project> {
  const existing = videoInFlight.get(projectId);
  if (existing) return existing;
  const job = runVideoJob(projectId).finally(() => {
    videoInFlight.delete(projectId);
  });
  videoInFlight.set(projectId, job);
  return job;
}

async function runVideoJob(projectId: string): Promise<Project> {
  const project = loadProject(projectId);
  if (project.videoUri && project.videoReady) return project;

  const stills = [...project.frames]
    .filter((frame) => frame.imageStatus === 'done')
    .sort((a, b) => a.order - b.order);

  if (!stills.length) {
    throw new Error('Render every keyframe before generating the video');
  }

  const poster =
    getImagePath(projectId, 'frame', stills[0].id) ??
    getImagePath(projectId, 'scene', stills[0].sceneId) ??
    null;

  try {
    const chunks = videoChunks(stills, project.durationSec);
    const clipRels: string[] = [];
    let cost = 0;

    markVideoProgress(projectId, {
      phase: 'queued',
      clipIndex: 1,
      clipTotal: chunks.length,
      startedAt: Date.now(),
    });

    for (const [i, chunk] of chunks.entries()) {
      markVideoProgress(projectId, {
        phase: 'queued',
        clipIndex: i + 1,
        clipTotal: chunks.length,
      });
      const uris = chunk.frames
        .map((frame) => readImageDataUri(getImagePath(projectId, 'frame', frame.id)))
        .filter((uri): uri is string => Boolean(uri));
      const first = uris[0];
      const last = uris[uris.length - 1];
      const prompt = assembleVideoPrompt({
        idea: project.idea,
        style: project.style,
        styleNotes: project.styleNotes,
        people: project.people,
        things: project.things,
        scenes: project.scenes,
        frames: chunk.frames,
        durationSec: chunk.duration,
      });
      const result = await generateVideo({
        prompt,
        durationSec: chunk.duration,
        firstFrame: first,
        lastFrame: last,
        referenceImages: uris,
        onStatus: (status) => {
          markVideoProgress(projectId, {
            phase:
              status === 'in_progress'
                ? 'rendering'
                : status === 'completed'
                  ? 'downloading'
                  : 'queued',
            clipIndex: i + 1,
            clipTotal: chunks.length,
          });
        },
      });
      cost += result.cost;
      clipRels.push(saveVideoFile(project.id, result.buffer, `clip-${i}.mp4`));
    }

    if (clipRels.length > 1) {
      markVideoProgress(projectId, { phase: 'stitching', clipTotal: chunks.length });
    }

    const reelRel = `${project.id}/video/reel.mp4`;
    await concatVideoFiles(clipRels, reelRel);
    return markVideoReady(projectId, poster, reelRel, cost);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Video generation failed';
    markVideoError(projectId, message);
    throw err;
  }
}

function videoChunks(
  frames: Frame[],
  durationSec: number,
): { frames: Frame[]; duration: number }[] {
  if (durationSec <= VIDEO_MAX_DURATION) {
    return [
      {
        frames,
        duration: Math.max(VIDEO_MIN_DURATION, durationSec),
      },
    ];
  }

  const n = Math.ceil(durationSec / VIDEO_MAX_DURATION);
  const chunkDur = Math.round(durationSec / n);
  const lastIndex = Math.max(frames.length - 1, 0);
  const chunks: { frames: Frame[]; duration: number }[] = [];

  for (let i = 0; i < n; i++) {
    const start = Math.floor((i * lastIndex) / n);
    const end = Math.floor(((i + 1) * lastIndex) / n);
    const slice = frames.slice(start, end + 1);
    chunks.push({
      frames: slice.length ? slice : [frames[frames.length - 1]],
      duration: Math.min(VIDEO_MAX_DURATION, Math.max(VIDEO_MIN_DURATION, chunkDur)),
    });
  }

  return chunks;
}
