import { IMAGE_MAX_REFS, IMAGE_MODEL, IMAGE_RESOLUTION, VIDEO_ASPECT_RATIO, VIDEO_MAX_DURATION, VIDEO_MIN_DURATION, VIDEO_MODEL, VIDEO_POLL_FETCH_MS, VIDEO_POLL_MS, VIDEO_RESOLUTION, VIDEO_SUPPORTS_LAST_FRAME, VIDEO_TIMEOUT_MS } from './config.js';
import { chatJson, headers, OPENROUTER_BASE } from './llm.js';
import { CAST_SYSTEM, SCENES_SYSTEM, TITLE_SYSTEM, framesSystem, worldBible } from './prompts.js';
import type { CastResult, FramesResult, Person, Scene, ScenesResult, Thing, ThingView } from './types.js';

const viewSchema = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    hint: { type: 'string' },
  },
  required: ['label', 'hint'],
  additionalProperties: false,
};

const CAST_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    styleNotes: { type: 'string' },
    people: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          look: { type: 'string' },
        },
        required: ['id', 'name', 'role', 'look'],
        additionalProperties: false,
      },
    },
    things: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          look: { type: 'string' },
          views: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: viewSchema,
          },
        },
        required: ['id', 'name', 'look', 'views'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'styleNotes', 'people', 'things'],
  additionalProperties: false,
};

const SCENES_SCHEMA = {
  type: 'object',
  properties: {
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          look: { type: 'string' },
          peopleIds: { type: 'array', items: { type: 'string' } },
          thingIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'title', 'look', 'peopleIds', 'thingIds'],
        additionalProperties: false,
      },
    },
  },
  required: ['scenes'],
  additionalProperties: false,
};

const FRAMES_SCHEMA = {
  type: 'object',
  properties: {
    frames: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          order: { type: 'integer' },
          sceneId: { type: 'string' },
          peopleIds: { type: 'array', items: { type: 'string' } },
          thingIds: { type: 'array', items: { type: 'string' } },
          action: { type: 'string' },
          camera: { type: 'string' },
        },
        required: ['id', 'order', 'sceneId', 'peopleIds', 'thingIds', 'action', 'camera'],
        additionalProperties: false,
      },
    },
  },
  required: ['frames'],
  additionalProperties: false,
};

function sanitizeId(raw: string, used: Set<string>, fallback: string): string {
  let base = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!base) base = fallback;
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  const id = `${base}-${n}`;
  used.add(id);
  return id;
}

function coerceViews(views: unknown): [ThingView, ThingView] {
  const pads: [ThingView, ThingView] = [
    { label: 'Front', hint: 'hero view' },
    { label: 'Detail', hint: 'close detail' },
  ];
  const src = Array.isArray(views) ? views : [];
  const pick = (i: 0 | 1): ThingView => {
    const v = src[i] as { label?: unknown; hint?: unknown } | undefined;
    return {
      label: typeof v?.label === 'string' && v.label.trim() ? v.label : pads[i].label,
      hint: typeof v?.hint === 'string' && v.hint.trim() ? v.hint : pads[i].hint,
    };
  };
  return [pick(0), pick(1)];
}

function filterIds(ids: unknown, known: Set<string>): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id !== 'string' || !known.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

const TITLE_SCHEMA = {
  type: 'object',
  properties: { title: { type: 'string' } },
  required: ['title'],
  additionalProperties: false,
};

export async function generateProjectTitle(input: {
  idea: string;
  style: string;
  durationSec: number;
}): Promise<{ title: string; cost: number }> {
  const { data, cost } = await chatJson<{ title: string }>({
    system: TITLE_SYSTEM,
    user: worldBible({
      idea: input.idea,
      style: input.style,
      durationSec: input.durationSec,
    }),
    schemaName: 'project_title',
    schema: TITLE_SCHEMA,
  });
  return { title: str(data.title), cost };
}

export async function generateCast(input: {
  idea: string;
  style: string;
  durationSec: number;
}): Promise<CastResult> {
  const { data, cost } = await chatJson<{
    title: string;
    styleNotes: string;
    people: Array<{ id: string; name: string; role: string; look: string }>;
    things: Array<{ id: string; name: string; look: string; views: ThingView[] }>;
  }>({
    system: CAST_SYSTEM,
    user: worldBible({
      idea: input.idea,
      style: input.style,
      durationSec: input.durationSec,
    }),
    schemaName: 'cast',
    schema: CAST_SCHEMA,
  });

  const used = new Set<string>();
  const people: CastResult['people'] = (data.people ?? []).map((p) => ({
    id: sanitizeId(str(p.id) || str(p.name), used, 'person'),
    name: str(p.name),
    role: str(p.role),
    look: str(p.look),
  }));
  const things: CastResult['things'] = (data.things ?? []).map((t) => ({
    id: sanitizeId(str(t.id) || str(t.name), used, 'thing'),
    name: str(t.name),
    look: str(t.look),
    views: coerceViews(t.views),
  }));

  return {
    title: str(data.title),
    styleNotes: str(data.styleNotes),
    people,
    things,
    cost,
  };
}

export async function generateScenes(input: {
  idea: string;
  style: string;
  styleNotes?: string;
  durationSec: number;
  people: Pick<Person, 'id' | 'name' | 'role' | 'look'>[];
  things: Pick<Thing, 'id' | 'name' | 'look'>[];
}): Promise<ScenesResult> {
  const knownPeople = new Set(input.people.map((p) => p.id));
  const knownThings = new Set(input.things.map((t) => t.id));

  const { data, cost } = await chatJson<{
    scenes: Array<{
      id: string;
      title: string;
      look: string;
      peopleIds: string[];
      thingIds: string[];
    }>;
  }>({
    system: SCENES_SYSTEM,
    user: worldBible({
      idea: input.idea,
      style: input.style,
      styleNotes: input.styleNotes,
      durationSec: input.durationSec,
      people: input.people,
      things: input.things,
    }),
    schemaName: 'scenes',
    schema: SCENES_SCHEMA,
  });

  const used = new Set<string>();
  const scenes: ScenesResult['scenes'] = (data.scenes ?? []).map((s) => ({
    id: sanitizeId(str(s.id) || str(s.title), used, 'scene'),
    title: str(s.title),
    look: str(s.look),
    peopleIds: filterIds(s.peopleIds, knownPeople),
    thingIds: filterIds(s.thingIds, knownThings),
  }));

  return { scenes, cost };
}

export async function generateFrames(input: {
  idea: string;
  style: string;
  styleNotes?: string;
  durationSec: number;
  people: Pick<Person, 'id' | 'name' | 'role' | 'look'>[];
  things: Pick<Thing, 'id' | 'name' | 'look'>[];
  scenes: Pick<Scene, 'id' | 'title' | 'look'>[];
}): Promise<FramesResult> {
  const knownPeople = new Set(input.people.map((p) => p.id));
  const knownThings = new Set(input.things.map((t) => t.id));
  const sceneIds = input.scenes.map((s) => s.id);
  const knownScenes = new Set(sceneIds);
  const range =
    input.durationSec <= 15 ? '3–7' : input.durationSec <= 30 ? '5–9' : '7–12';

  const { data, cost } = await chatJson<{
    frames: Array<{
      id: string;
      order: number;
      sceneId: string;
      peopleIds: string[];
      thingIds: string[];
      action: string;
      camera: string;
    }>;
  }>({
    system: framesSystem(range, input.durationSec),
    user: worldBible({
      idea: input.idea,
      style: input.style,
      styleNotes: input.styleNotes,
      durationSec: input.durationSec,
      people: input.people,
      things: input.things,
      scenes: input.scenes,
    }),
    schemaName: 'frames',
    schema: FRAMES_SCHEMA,
  });

  const used = new Set<string>();
  const frames: FramesResult['frames'] = [];
  for (const f of data.frames ?? []) {
    const rawSceneId = str(f.sceneId);
    let sceneId: string | null = null;
    if (knownScenes.has(rawSceneId)) sceneId = rawSceneId;
    else if (sceneIds.length === 1) sceneId = sceneIds[0];
    if (!sceneId) continue;

    frames.push({
      id: sanitizeId(str(f.id) || `frame-${f.order}`, used, 'frame'),
      order: typeof f.order === 'number' && Number.isFinite(f.order) ? f.order : frames.length + 1,
      sceneId,
      peopleIds: filterIds(f.peopleIds, knownPeople),
      thingIds: filterIds(f.thingIds, knownThings),
      action: str(f.action),
      camera: str(f.camera),
    });
  }

  frames.sort((a, b) => a.order - b.order);
  return { frames, cost };
}

export async function generateImage(input: {
  prompt: string;
  aspectRatio: string;
  referenceImages?: string[];
}): Promise<{ base64: string; mediaType: string; cost: number }> {
  const body: Record<string, unknown> = {
    model: IMAGE_MODEL,
    prompt: input.prompt,
    resolution: IMAGE_RESOLUTION,
    aspect_ratio: input.aspectRatio,
    n: 1,
  };

  if (input.referenceImages?.length) {
    const urls = input.referenceImages.slice(0, IMAGE_MAX_REFS);
    body.input_references = urls.map((url) => ({
      type: 'image_url',
      image_url: { url },
    }));
  }

  const res = await fetch(`${OPENROUTER_BASE}/images`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image generation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const image = data.data?.[0];
  if (!image?.b64_json) throw new Error('No image in response');

  return {
    base64: image.b64_json,
    mediaType: image.media_type ?? 'image/png',
    cost: data.usage?.cost ?? 0.04,
  };
}

type VideoJob = {
  id: string;
  polling_url?: string;
  status: string;
  error?: unknown;
  unsigned_urls?: string[];
  usage?: { cost?: number };
};

function clampDuration(sec: number): number {
  return Math.min(VIDEO_MAX_DURATION, Math.max(VIDEO_MIN_DURATION, Math.round(sec)));
}

function jobError(job: VideoJob): string {
  const err = job.error;
  if (typeof err === 'string' && err.trim()) return err;
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return `Video generation ${job.status}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollVideoJob(
  initial: VideoJob,
  onStatus?: (status: string) => void,
): Promise<VideoJob> {
  const pollingUrl = new URL(initial.polling_url ?? `/api/v1/videos/${initial.id}`, 'https://openrouter.ai').toString();
  const deadline = Date.now() + VIDEO_TIMEOUT_MS;
  let job = initial;
  onStatus?.(job.status);

  while (true) {
    if (job.status === 'completed') return job;
    if (job.status === 'failed' || job.status === 'cancelled' || job.status === 'expired') {
      throw new Error(jobError(job));
    }
    if (Date.now() >= deadline) {
      throw new Error(`Video job ${job.id} timed out`);
    }
    await sleep(VIDEO_POLL_MS);
    try {
      const res = await fetch(pollingUrl, {
        headers: headers(),
        signal: AbortSignal.timeout(VIDEO_POLL_FETCH_MS),
      });
      if (!res.ok) {
        throw new Error(`Video poll failed (${res.status}): ${await res.text()}`);
      }
      job = (await res.json()) as VideoJob;
      onStatus?.(job.status);
    } catch (err) {
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        continue;
      }
      throw err;
    }
  }
}

async function downloadVideoJob(job: VideoJob): Promise<Buffer> {
  const url =
    job.unsigned_urls?.[0] ?? `${OPENROUTER_BASE}/videos/${job.id}/content?index=0`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`Video download failed (${res.status}): ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function generateVideo(input: {
  prompt: string;
  durationSec: number;
  firstFrame?: string;
  lastFrame?: string;
  referenceImages?: string[];
  onStatus?: (status: string) => void;
}): Promise<{ buffer: Buffer; cost: number }> {
  const duration = clampDuration(input.durationSec);
  const body: Record<string, unknown> = {
    model: VIDEO_MODEL,
    prompt: input.prompt,
    duration,
    resolution: VIDEO_RESOLUTION,
    aspect_ratio: VIDEO_ASPECT_RATIO,
    generate_audio: true,
  };

  const frames: Array<{
    type: 'image_url';
    image_url: { url: string };
    frame_type: 'first_frame' | 'last_frame';
  }> = [];
  if (input.firstFrame) {
    frames.push({
      type: 'image_url',
      image_url: { url: input.firstFrame },
      frame_type: 'first_frame',
    });
  }
  if (
    VIDEO_SUPPORTS_LAST_FRAME &&
    input.lastFrame &&
    input.lastFrame !== input.firstFrame
  ) {
    frames.push({
      type: 'image_url',
      image_url: { url: input.lastFrame },
      frame_type: 'last_frame',
    });
  }
  if (frames.length) body.frame_images = frames;

  const refs = (input.referenceImages ?? []).filter(
    (url) => url !== input.firstFrame && url !== input.lastFrame,
  );
  if (refs.length) {
    body.input_references = refs.slice(0, IMAGE_MAX_REFS).map((url) => ({
      type: 'image_url',
      image_url: { url },
    }));
  }

  const res = await fetch(`${OPENROUTER_BASE}/videos`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Video generation failed (${res.status}): ${await res.text()}`);
  }

  const submitted = (await res.json()) as VideoJob;
  if (!submitted.id) throw new Error('No video job id in response');

  const completed = await pollVideoJob(submitted, input.onStatus);
  const buffer = await downloadVideoJob(completed);
  return { buffer, cost: completed.usage?.cost ?? 0 };
}
