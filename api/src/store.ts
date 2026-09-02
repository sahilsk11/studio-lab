import {
  DEFAULT_DURATION,
  DEFAULT_IDEA,
  DEFAULT_STYLE,
  PROJECT_ID,
} from './config.js';
import { getDb } from './db.js';
import { mediaUrl, removeKindMedia, removeProjectMedia, removeVideoMedia } from './media.js';
import type {
  Frame,
  ImageKind,
  ImageStatus,
  Person,
  Project,
  Scene,
  Thing,
  ThingView,
  VideoPhase,
} from './types.js';

type ImageRow = {
  image_status: string;
  image_path: string | null;
  image_cost: number | null;
  image_error: string | null;
  image_stale: number;
  image_rev: number;
};

function now(): string {
  return new Date().toISOString();
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseViews(raw: string): [ThingView, ThingView] {
  const views = parseJson<ThingView[]>(raw, []);
  const fallback: ThingView = { label: 'Front', hint: 'hero view' };
  const detail: ThingView = { label: 'Detail', hint: 'close detail' };
  return [views[0] ?? fallback, views[1] ?? detail];
}

function imageFields(row: ImageRow) {
  const status = (row.image_status === 'generating' ? 'pending' : row.image_status) as ImageStatus;
  return {
    imageStatus: status,
    imageUri: mediaUrl(row.image_path, row.image_rev),
    imageCost: row.image_cost ?? undefined,
    imageError: row.image_error ?? undefined,
    imageStale: row.image_stale === 1,
  };
}

export function ensureProject(defaults?: {
  idea?: string;
  style?: string;
  durationSec?: number;
}): Project {
  const db = getDb();
  const row = db.prepare('SELECT id FROM projects WHERE id = ?').get(PROJECT_ID);
  if (!row) {
    const ts = now();
    db.prepare(
      `INSERT INTO projects (id, title, idea, style, style_notes, duration_sec, video_ready, total_cost, created_at, updated_at)
       VALUES (?, '', ?, ?, '', ?, 0, 0, ?, ?)`,
    ).run(
      PROJECT_ID,
      defaults?.idea ?? DEFAULT_IDEA,
      defaults?.style ?? DEFAULT_STYLE,
      defaults?.durationSec ?? DEFAULT_DURATION,
      ts,
      ts,
    );
  }
  return loadProject();
}

export function loadProject(): Project {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(PROJECT_ID) as
    | {
        id: string;
        title: string;
        idea: string;
        style: string;
        style_notes: string;
        duration_sec: number;
        video_ready: number;
        video_poster_path: string | null;
        video_path: string | null;
        video_rev: number;
        video_error: string | null;
        video_phase: string | null;
        video_clip_index: number | null;
        video_clip_total: number | null;
        video_started_at: number | null;
        total_cost: number;
      }
    | undefined;

  if (!project) return ensureProject();

  const people = db
    .prepare('SELECT * FROM people WHERE project_id = ? ORDER BY sort_order, id')
    .all(PROJECT_ID) as Array<
    ImageRow & { id: string; name: string; role: string; look: string }
  >;
  const things = db
    .prepare('SELECT * FROM things WHERE project_id = ? ORDER BY sort_order, id')
    .all(PROJECT_ID) as Array<ImageRow & { id: string; name: string; look: string; views_json: string }>;
  const scenes = db
    .prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY sort_order, id')
    .all(PROJECT_ID) as Array<
    ImageRow & {
      id: string;
      title: string;
      look: string;
      people_ids_json: string;
      thing_ids_json: string;
    }
  >;
  const frames = db
    .prepare('SELECT * FROM frames WHERE project_id = ? ORDER BY sort_order, id')
    .all(PROJECT_ID) as Array<
    ImageRow & {
      id: string;
      scene_id: string;
      sort_order: number;
      people_ids_json: string;
      thing_ids_json: string;
      action: string;
      camera: string;
    }
  >;

  return {
    id: project.id,
    title: project.title,
    idea: project.idea,
    style: project.style,
    styleNotes: project.style_notes,
    durationSec: project.duration_sec,
    people: people.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      look: row.look,
      ...imageFields(row),
    })),
    things: things.map((row) => ({
      id: row.id,
      name: row.name,
      look: row.look,
      views: parseViews(row.views_json),
      ...imageFields(row),
    })),
    scenes: scenes.map((row) => ({
      id: row.id,
      title: row.title,
      look: row.look,
      peopleIds: parseJson<string[]>(row.people_ids_json, []),
      thingIds: parseJson<string[]>(row.thing_ids_json, []),
      ...imageFields(row),
    })),
    frames: frames.map((row) => ({
      id: row.id,
      order: row.sort_order,
      sceneId: row.scene_id,
      peopleIds: parseJson<string[]>(row.people_ids_json, []),
      thingIds: parseJson<string[]>(row.thing_ids_json, []),
      action: row.action,
      camera: row.camera,
      ...imageFields(row),
    })),
    videoReady: project.video_ready === 1,
    videoPosterUri: mediaUrl(project.video_poster_path, project.video_rev || 1),
    videoUri: mediaUrl(project.video_path, project.video_rev || 1),
    videoError: project.video_error ?? undefined,
    videoPhase: (project.video_ready === 1 ? 'ready' : (project.video_phase as VideoPhase) || 'idle'),
    videoClipIndex: project.video_clip_index ?? undefined,
    videoClipTotal: project.video_clip_total ?? undefined,
    videoStartedAt: project.video_started_at ?? undefined,
    totalCost: project.total_cost,
  };
}

export function patchProject(patch: {
  idea?: string;
  style?: string;
  durationSec?: number;
}): Project {
  ensureProject();
  const db = getDb();
  const current = db.prepare('SELECT idea, style, duration_sec FROM projects WHERE id = ?').get(
    PROJECT_ID,
  ) as { idea: string; style: string; duration_sec: number };
  db.prepare(
    `UPDATE projects SET idea = ?, style = ?, duration_sec = ?, updated_at = ? WHERE id = ?`,
  ).run(
    patch.idea ?? current.idea,
    patch.style ?? current.style,
    patch.durationSec ?? current.duration_sec,
    now(),
    PROJECT_ID,
  );
  return loadProject();
}

export function resetProject(defaults?: { style?: string; durationSec?: number }): Project {
  const db = getDb();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM frames WHERE project_id = ?').run(PROJECT_ID);
    db.prepare('DELETE FROM scenes WHERE project_id = ?').run(PROJECT_ID);
    db.prepare('DELETE FROM things WHERE project_id = ?').run(PROJECT_ID);
    db.prepare('DELETE FROM people WHERE project_id = ?').run(PROJECT_ID);
    db.prepare(
      `UPDATE projects SET title = '', idea = ?, style = ?, style_notes = '', duration_sec = ?,
       video_ready = 0, video_poster_path = NULL, video_path = NULL, video_error = NULL,
       video_phase = 'idle', video_clip_index = NULL, video_clip_total = NULL, video_started_at = NULL,
       video_rev = video_rev + 1, total_cost = 0, updated_at = ? WHERE id = ?`,
    ).run(
      DEFAULT_IDEA,
      defaults?.style ?? DEFAULT_STYLE,
      defaults?.durationSec ?? DEFAULT_DURATION,
      now(),
      PROJECT_ID,
    );
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  removeProjectMedia(PROJECT_ID);
  return loadProject();
}

function addCost(cost: number): void {
  getDb()
    .prepare('UPDATE projects SET total_cost = total_cost + ?, updated_at = ? WHERE id = ?')
    .run(cost, now(), PROJECT_ID);
}

export function replaceCast(input: {
  title: string;
  styleNotes: string;
  idea: string;
  style: string;
  durationSec: number;
  people: Pick<Person, 'id' | 'name' | 'role' | 'look'>[];
  things: Pick<Thing, 'id' | 'name' | 'look' | 'views'>[];
  cost: number;
}): Project {
  ensureProject();
  const db = getDb();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM frames WHERE project_id = ?').run(PROJECT_ID);
    db.prepare('DELETE FROM scenes WHERE project_id = ?').run(PROJECT_ID);
    db.prepare('DELETE FROM things WHERE project_id = ?').run(PROJECT_ID);
    db.prepare('DELETE FROM people WHERE project_id = ?').run(PROJECT_ID);
    db.prepare(
      `UPDATE projects SET title = ?, style_notes = ?, idea = ?, style = ?, duration_sec = ?,
       video_ready = 0, video_poster_path = NULL, video_path = NULL, video_error = NULL,
       video_phase = 'idle', video_clip_index = NULL, video_clip_total = NULL, video_started_at = NULL,
       video_rev = video_rev + 1, total_cost = ?, updated_at = ? WHERE id = ?`,
    ).run(
      input.title,
      input.styleNotes,
      input.idea,
      input.style,
      input.durationSec,
      input.cost,
      now(),
      PROJECT_ID,
    );

    const insertPerson = db.prepare(
      `INSERT INTO people (project_id, id, name, role, look, sort_order, image_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    );
    input.people.forEach((person, i) => {
      insertPerson.run(PROJECT_ID, person.id, person.name, person.role, person.look, i);
    });

    const insertThing = db.prepare(
      `INSERT INTO things (project_id, id, name, look, views_json, sort_order, image_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    );
    input.things.forEach((thing, i) => {
      insertThing.run(
        PROJECT_ID,
        thing.id,
        thing.name,
        thing.look,
        JSON.stringify(thing.views),
        i,
      );
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  removeKindMedia(PROJECT_ID, ['person', 'thing', 'scene', 'frame']);
  removeVideoMedia(PROJECT_ID);
  return loadProject();
}

export function replaceScenes(input: {
  scenes: Pick<Scene, 'id' | 'title' | 'look' | 'peopleIds' | 'thingIds'>[];
  cost: number;
}): Project {
  ensureProject();
  const db = getDb();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM frames WHERE project_id = ?').run(PROJECT_ID);
    db.prepare('DELETE FROM scenes WHERE project_id = ?').run(PROJECT_ID);
    db.prepare(
      `UPDATE projects SET video_ready = 0, video_poster_path = NULL, video_path = NULL,
       video_error = NULL, video_phase = 'idle', video_clip_index = NULL, video_clip_total = NULL,
       video_started_at = NULL, video_rev = video_rev + 1, updated_at = ? WHERE id = ?`,
    ).run(now(), PROJECT_ID);

    const insert = db.prepare(
      `INSERT INTO scenes (project_id, id, title, look, people_ids_json, thing_ids_json, sort_order, image_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    );
    input.scenes.forEach((scene, i) => {
      insert.run(
        PROJECT_ID,
        scene.id,
        scene.title,
        scene.look,
        JSON.stringify(scene.peopleIds),
        JSON.stringify(scene.thingIds),
        i,
      );
    });
    addCost(input.cost);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  removeKindMedia(PROJECT_ID, ['scene', 'frame']);
  removeVideoMedia(PROJECT_ID);
  return loadProject();
}

export function replaceFrames(input: {
  frames: Pick<Frame, 'id' | 'order' | 'sceneId' | 'peopleIds' | 'thingIds' | 'action' | 'camera'>[];
  cost: number;
}): Project {
  ensureProject();
  const db = getDb();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM frames WHERE project_id = ?').run(PROJECT_ID);
    db.prepare(
      `UPDATE projects SET video_ready = 0, video_poster_path = NULL, video_path = NULL,
       video_error = NULL, video_phase = 'idle', video_clip_index = NULL, video_clip_total = NULL,
       video_started_at = NULL, video_rev = video_rev + 1, updated_at = ? WHERE id = ?`,
    ).run(now(), PROJECT_ID);

    const insert = db.prepare(
      `INSERT INTO frames (project_id, id, scene_id, sort_order, people_ids_json, thing_ids_json, action, camera, image_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    );
    const sorted = [...input.frames].sort((a, b) => a.order - b.order);
    sorted.forEach((frame, i) => {
      insert.run(
        PROJECT_ID,
        frame.id,
        frame.sceneId,
        frame.order || i + 1,
        JSON.stringify(frame.peopleIds),
        JSON.stringify(frame.thingIds),
        frame.action,
        frame.camera,
      );
    });
    addCost(input.cost);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  removeKindMedia(PROJECT_ID, ['frame']);
  removeVideoMedia(PROJECT_ID);
  return loadProject();
}

const TABLE: Record<ImageKind, string> = {
  person: 'people',
  thing: 'things',
  scene: 'scenes',
  frame: 'frames',
};

export function markGenerating(kind: ImageKind, id: string): void {
  getDb()
    .prepare(
      `UPDATE ${TABLE[kind]} SET image_status = 'generating', image_error = NULL WHERE project_id = ? AND id = ?`,
    )
    .run(PROJECT_ID, id);
}

export function markImageDone(
  kind: ImageKind,
  id: string,
  imagePath: string,
  cost: number,
): void {
  const db = getDb();
  db.prepare(
    `UPDATE ${TABLE[kind]} SET image_status = 'done', image_path = ?, image_cost = ?, image_error = NULL,
     image_stale = 0, image_rev = image_rev + 1 WHERE project_id = ? AND id = ?`,
  ).run(imagePath, cost, PROJECT_ID, id);
  addCost(cost);
}

export function markImageError(kind: ImageKind, id: string, message: string): void {
  getDb()
    .prepare(
      `UPDATE ${TABLE[kind]} SET image_status = 'error', image_error = ? WHERE project_id = ? AND id = ?`,
    )
    .run(message, PROJECT_ID, id);
}

export function markVideoReady(posterPath: string | null, videoPath: string, cost: number): Project {
  const db = getDb();
  db.prepare(
    `UPDATE projects SET video_ready = 1, video_poster_path = ?, video_path = ?, video_error = NULL,
     video_phase = 'ready', video_clip_index = NULL, video_clip_total = NULL, video_started_at = NULL,
     video_rev = video_rev + 1, updated_at = ? WHERE id = ?`,
  ).run(posterPath, videoPath, now(), PROJECT_ID);
  addCost(cost);
  return loadProject();
}

export function markVideoError(message: string): Project {
  getDb()
    .prepare(
      `UPDATE projects SET video_ready = 0, video_error = ?, video_phase = 'error', video_path = NULL,
       updated_at = ? WHERE id = ?`,
    )
    .run(message, now(), PROJECT_ID);
  return loadProject();
}

export function markVideoProgress(patch: {
  phase: VideoPhase;
  clipIndex?: number;
  clipTotal?: number;
  startedAt?: number | null;
}): void {
  const sets = ['video_phase = ?', 'updated_at = ?'];
  const values: Array<string | number | null> = [patch.phase, now()];
  if (patch.clipIndex !== undefined) {
    sets.push('video_clip_index = ?');
    values.push(patch.clipIndex);
  }
  if (patch.clipTotal !== undefined) {
    sets.push('video_clip_total = ?');
    values.push(patch.clipTotal);
  }
  if (patch.startedAt !== undefined) {
    sets.push('video_started_at = ?');
    values.push(patch.startedAt);
  }
  values.push(PROJECT_ID);
  getDb()
    .prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`)
    .run(...values);
}

export function getImagePath(kind: ImageKind, id: string): string | null {
  const row = getDb()
    .prepare(`SELECT image_path FROM ${TABLE[kind]} WHERE project_id = ? AND id = ?`)
    .get(PROJECT_ID, id) as { image_path: string | null } | undefined;
  return row?.image_path ?? null;
}

export type ItemPatch = {
  name?: string;
  role?: string;
  look?: string;
  title?: string;
  action?: string;
  camera?: string;
};

function clearVideo(): void {
  getDb()
    .prepare(
      `UPDATE projects SET video_ready = 0, video_poster_path = NULL, video_path = NULL,
       video_error = NULL, video_phase = 'idle', video_clip_index = NULL, video_clip_total = NULL,
       video_started_at = NULL, video_rev = video_rev + 1, updated_at = ? WHERE id = ?`,
    )
    .run(now(), PROJECT_ID);
  removeVideoMedia(PROJECT_ID);
}

export function patchItem(kind: ImageKind, id: string, patch: ItemPatch): Project {
  ensureProject();
  const db = getDb();
  const table = TABLE[kind];
  const exists = db.prepare(`SELECT id FROM ${table} WHERE project_id = ? AND id = ?`).get(PROJECT_ID, id);
  if (!exists) throw new Error(`${kind} ${id} not found`);

  const sets: string[] = [];
  const values: string[] = [];
  const take = (column: string, value: string | undefined) => {
    if (value === undefined) return;
    sets.push(`${column} = ?`);
    values.push(value);
  };

  if (kind === 'person') {
    take('name', patch.name);
    take('role', patch.role);
    take('look', patch.look);
  } else if (kind === 'thing') {
    take('name', patch.name);
    take('look', patch.look);
  } else if (kind === 'scene') {
    take('title', patch.title);
    take('look', patch.look);
  } else {
    take('action', patch.action);
    take('camera', patch.camera);
  }

  if (sets.length) {
    sets.push(`image_stale = CASE WHEN image_status = 'done' THEN 1 ELSE image_stale END`);
    values.push(PROJECT_ID, id);
    db.prepare(
      `UPDATE ${table} SET ${sets.join(', ')} WHERE project_id = ? AND id = ?`,
    ).run(...values);
  }

  clearVideo();
  return loadProject();
}

function rewriteIds(
  table: 'scenes' | 'frames',
  column: 'people_ids_json' | 'thing_ids_json',
  dropId: string,
): void {
  const db = getDb();
  const rows = db
    .prepare(`SELECT id, ${column} AS json FROM ${table} WHERE project_id = ?`)
    .all(PROJECT_ID) as Array<{ id: string; json: string }>;
  const update = db.prepare(
    `UPDATE ${table} SET ${column} = ? WHERE project_id = ? AND id = ?`,
  );
  for (const row of rows) {
    const ids = parseJson<string[]>(row.json, []).filter((item) => item !== dropId);
    update.run(JSON.stringify(ids), PROJECT_ID, row.id);
  }
}

export function deleteItem(kind: ImageKind, id: string): Project {
  ensureProject();
  const db = getDb();
  const table = TABLE[kind];
  const exists = db.prepare(`SELECT id FROM ${table} WHERE project_id = ? AND id = ?`).get(PROJECT_ID, id);
  if (!exists) throw new Error(`${kind} ${id} not found`);

  if (kind === 'person') {
    rewriteIds('scenes', 'people_ids_json', id);
    rewriteIds('frames', 'people_ids_json', id);
  } else if (kind === 'thing') {
    rewriteIds('scenes', 'thing_ids_json', id);
    rewriteIds('frames', 'thing_ids_json', id);
  } else if (kind === 'scene') {
    db.prepare(`DELETE FROM frames WHERE project_id = ? AND scene_id = ?`).run(PROJECT_ID, id);
    removeKindMedia(PROJECT_ID, ['frame']);
  }

  db.prepare(`DELETE FROM ${table} WHERE project_id = ? AND id = ?`).run(PROJECT_ID, id);
  clearVideo();
  return loadProject();
}
