import { randomUUID } from 'node:crypto';

import { DEFAULT_DURATION, DEFAULT_IDEA, DEFAULT_STYLE } from './config.js';
import { getDb } from './db.js';
import { mediaUrl, removeKindMedia, removeProjectMedia, removeVideoMedia } from './media.js';
import type {
  Frame,
  ImageKind,
  ImageStatus,
  Person,
  Project,
  ProjectSummary,
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

export class StoreError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'StoreError';
    this.status = status;
  }
}

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

type ProjectRow = {
  id: string;
  user_id: string;
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
  updated_at: string;
};

function projectRow(projectId: string): ProjectRow {
  const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as
    | ProjectRow
    | undefined;
  if (!row) throw new StoreError(404, 'Project not found');
  return row;
}

export function assertOwnedProject(projectId: string, userId: string): ProjectRow {
  const row = projectRow(projectId);
  if (row.user_id !== userId) throw new StoreError(404, 'Project not found');
  return row;
}

export function claimOrphanedProjects(userId: string): void {
  getDb().prepare('UPDATE projects SET user_id = ? WHERE user_id IS NULL').run(userId);
}

export function listNamedProjects(userId: string): ProjectSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT id, title, idea, style, duration_sec, updated_at
       FROM projects
       WHERE user_id = ? AND TRIM(title) != ''
       ORDER BY updated_at DESC`,
    )
    .all(userId) as Array<{
    id: string;
    title: string;
    idea: string;
    style: string;
    duration_sec: number;
    updated_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    idea: row.idea,
    style: row.style,
    durationSec: row.duration_sec,
    updatedAt: row.updated_at,
  }));
}

export function createProject(input: {
  userId: string;
  title: string;
  idea: string;
  style: string;
  durationSec: number;
  cost?: number;
}): Project {
  const title = input.title.trim();
  if (!title) throw new StoreError(400, 'Project title is required');

  const id = randomUUID();
  const ts = now();
  getDb()
    .prepare(
      `INSERT INTO projects (id, user_id, title, idea, style, style_notes, duration_sec, video_ready, total_cost, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '', ?, 0, ?, ?, ?)`,
    )
    .run(
      id,
      input.userId,
      title,
      input.idea,
      input.style,
      input.durationSec,
      input.cost ?? 0,
      ts,
      ts,
    );
  return loadProject(id);
}

export function loadProject(projectId: string): Project {
  const db = getDb();
  const project = projectRow(projectId);

  const people = db
    .prepare('SELECT * FROM people WHERE project_id = ? ORDER BY sort_order, id')
    .all(projectId) as Array<ImageRow & { id: string; name: string; role: string; look: string }>;
  const things = db
    .prepare('SELECT * FROM things WHERE project_id = ? ORDER BY sort_order, id')
    .all(projectId) as Array<ImageRow & { id: string; name: string; look: string; views_json: string }>;
  const scenes = db
    .prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY sort_order, id')
    .all(projectId) as Array<
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
    .all(projectId) as Array<
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
    userId: project.user_id,
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

export function loadOwnedProject(projectId: string, userId: string): Project {
  assertOwnedProject(projectId, userId);
  return loadProject(projectId);
}

export function patchProject(
  projectId: string,
  patch: {
    idea?: string;
    style?: string;
    durationSec?: number;
  },
): Project {
  const current = projectRow(projectId);
  getDb()
    .prepare(
      `UPDATE projects SET idea = ?, style = ?, duration_sec = ?, updated_at = ? WHERE id = ?`,
    )
    .run(
      patch.idea ?? current.idea,
      patch.style ?? current.style,
      patch.durationSec ?? current.duration_sec,
      now(),
      projectId,
    );
  return loadProject(projectId);
}

export function resetProject(
  projectId: string,
  defaults?: { style?: string; durationSec?: number },
): Project {
  const db = getDb();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM frames WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM scenes WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM things WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM people WHERE project_id = ?').run(projectId);
    db.prepare(
      `UPDATE projects SET idea = ?, style = ?, style_notes = '', duration_sec = ?,
       video_ready = 0, video_poster_path = NULL, video_path = NULL, video_error = NULL,
       video_phase = 'idle', video_clip_index = NULL, video_clip_total = NULL, video_started_at = NULL,
       video_rev = video_rev + 1, total_cost = 0, updated_at = ? WHERE id = ?`,
    ).run(
      DEFAULT_IDEA,
      defaults?.style ?? DEFAULT_STYLE,
      defaults?.durationSec ?? DEFAULT_DURATION,
      now(),
      projectId,
    );
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  removeProjectMedia(projectId);
  return loadProject(projectId);
}

function addCost(projectId: string, cost: number): void {
  getDb()
    .prepare('UPDATE projects SET total_cost = total_cost + ?, updated_at = ? WHERE id = ?')
    .run(cost, now(), projectId);
}

export function replaceCast(
  projectId: string,
  input: {
    styleNotes: string;
    idea: string;
    style: string;
    durationSec: number;
    people: Pick<Person, 'id' | 'name' | 'role' | 'look'>[];
    things: Pick<Thing, 'id' | 'name' | 'look' | 'views'>[];
    cost: number;
  },
): Project {
  projectRow(projectId);
  const db = getDb();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM frames WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM scenes WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM things WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM people WHERE project_id = ?').run(projectId);
    db.prepare(
      `UPDATE projects SET style_notes = ?, idea = ?, style = ?, duration_sec = ?,
       video_ready = 0, video_poster_path = NULL, video_path = NULL, video_error = NULL,
       video_phase = 'idle', video_clip_index = NULL, video_clip_total = NULL, video_started_at = NULL,
       video_rev = video_rev + 1, total_cost = ?, updated_at = ? WHERE id = ?`,
    ).run(
      input.styleNotes,
      input.idea,
      input.style,
      input.durationSec,
      input.cost,
      now(),
      projectId,
    );

    const insertPerson = db.prepare(
      `INSERT INTO people (project_id, id, name, role, look, sort_order, image_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    );
    input.people.forEach((person, i) => {
      insertPerson.run(projectId, person.id, person.name, person.role, person.look, i);
    });

    const insertThing = db.prepare(
      `INSERT INTO things (project_id, id, name, look, views_json, sort_order, image_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    );
    input.things.forEach((thing, i) => {
      insertThing.run(
        projectId,
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
  removeKindMedia(projectId, ['person', 'thing', 'scene', 'frame']);
  removeVideoMedia(projectId);
  return loadProject(projectId);
}

export function replaceScenes(
  projectId: string,
  input: {
    scenes: Pick<Scene, 'id' | 'title' | 'look' | 'peopleIds' | 'thingIds'>[];
    cost: number;
  },
): Project {
  projectRow(projectId);
  const db = getDb();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM frames WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM scenes WHERE project_id = ?').run(projectId);
    db.prepare(
      `UPDATE projects SET video_ready = 0, video_poster_path = NULL, video_path = NULL,
       video_error = NULL, video_phase = 'idle', video_clip_index = NULL, video_clip_total = NULL,
       video_started_at = NULL, video_rev = video_rev + 1, updated_at = ? WHERE id = ?`,
    ).run(now(), projectId);

    const insert = db.prepare(
      `INSERT INTO scenes (project_id, id, title, look, people_ids_json, thing_ids_json, sort_order, image_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    );
    input.scenes.forEach((scene, i) => {
      insert.run(
        projectId,
        scene.id,
        scene.title,
        scene.look,
        JSON.stringify(scene.peopleIds),
        JSON.stringify(scene.thingIds),
        i,
      );
    });
    addCost(projectId, input.cost);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  removeKindMedia(projectId, ['scene', 'frame']);
  removeVideoMedia(projectId);
  return loadProject(projectId);
}

export function replaceFrames(
  projectId: string,
  input: {
    frames: Pick<Frame, 'id' | 'order' | 'sceneId' | 'peopleIds' | 'thingIds' | 'action' | 'camera'>[];
    cost: number;
  },
): Project {
  projectRow(projectId);
  const db = getDb();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM frames WHERE project_id = ?').run(projectId);
    db.prepare(
      `UPDATE projects SET video_ready = 0, video_poster_path = NULL, video_path = NULL,
       video_error = NULL, video_phase = 'idle', video_clip_index = NULL, video_clip_total = NULL,
       video_started_at = NULL, video_rev = video_rev + 1, updated_at = ? WHERE id = ?`,
    ).run(now(), projectId);

    const insert = db.prepare(
      `INSERT INTO frames (project_id, id, scene_id, sort_order, people_ids_json, thing_ids_json, action, camera, image_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    );
    const sorted = [...input.frames].sort((a, b) => a.order - b.order);
    sorted.forEach((frame, i) => {
      insert.run(
        projectId,
        frame.id,
        frame.sceneId,
        frame.order || i + 1,
        JSON.stringify(frame.peopleIds),
        JSON.stringify(frame.thingIds),
        frame.action,
        frame.camera,
      );
    });
    addCost(projectId, input.cost);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  removeKindMedia(projectId, ['frame']);
  removeVideoMedia(projectId);
  return loadProject(projectId);
}

const TABLE: Record<ImageKind, string> = {
  person: 'people',
  thing: 'things',
  scene: 'scenes',
  frame: 'frames',
};

export function markGenerating(projectId: string, kind: ImageKind, id: string): void {
  getDb()
    .prepare(
      `UPDATE ${TABLE[kind]} SET image_status = 'generating', image_error = NULL WHERE project_id = ? AND id = ?`,
    )
    .run(projectId, id);
}

export function markImageDone(
  projectId: string,
  kind: ImageKind,
  id: string,
  imagePath: string,
  cost: number,
): void {
  const db = getDb();
  db.prepare(
    `UPDATE ${TABLE[kind]} SET image_status = 'done', image_path = ?, image_cost = ?, image_error = NULL,
     image_stale = 0, image_rev = image_rev + 1 WHERE project_id = ? AND id = ?`,
  ).run(imagePath, cost, projectId, id);
  addCost(projectId, cost);
}

export function markImageError(projectId: string, kind: ImageKind, id: string, message: string): void {
  getDb()
    .prepare(
      `UPDATE ${TABLE[kind]} SET image_status = 'error', image_error = ? WHERE project_id = ? AND id = ?`,
    )
    .run(message, projectId, id);
}

export function markVideoReady(
  projectId: string,
  posterPath: string | null,
  videoPath: string,
  cost: number,
): Project {
  const db = getDb();
  db.prepare(
    `UPDATE projects SET video_ready = 1, video_poster_path = ?, video_path = ?, video_error = NULL,
     video_phase = 'ready', video_clip_index = NULL, video_clip_total = NULL, video_started_at = NULL,
     video_rev = video_rev + 1, updated_at = ? WHERE id = ?`,
  ).run(posterPath, videoPath, now(), projectId);
  addCost(projectId, cost);
  return loadProject(projectId);
}

export function markVideoError(projectId: string, message: string): Project {
  getDb()
    .prepare(
      `UPDATE projects SET video_ready = 0, video_error = ?, video_phase = 'error', video_path = NULL,
       updated_at = ? WHERE id = ?`,
    )
    .run(message, now(), projectId);
  return loadProject(projectId);
}

export function markVideoProgress(
  projectId: string,
  patch: {
    phase: VideoPhase;
    clipIndex?: number;
    clipTotal?: number;
    startedAt?: number | null;
  },
): void {
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
  values.push(projectId);
  getDb()
    .prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`)
    .run(...values);
}

export function getImagePath(projectId: string, kind: ImageKind, id: string): string | null {
  const row = getDb()
    .prepare(`SELECT image_path FROM ${TABLE[kind]} WHERE project_id = ? AND id = ?`)
    .get(projectId, id) as { image_path: string | null } | undefined;
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

function clearVideo(projectId: string): void {
  getDb()
    .prepare(
      `UPDATE projects SET video_ready = 0, video_poster_path = NULL, video_path = NULL,
       video_error = NULL, video_phase = 'idle', video_clip_index = NULL, video_clip_total = NULL,
       video_started_at = NULL, video_rev = video_rev + 1, updated_at = ? WHERE id = ?`,
    )
    .run(now(), projectId);
  removeVideoMedia(projectId);
}

export function patchItem(projectId: string, kind: ImageKind, id: string, patch: ItemPatch): Project {
  const db = getDb();
  const table = TABLE[kind];
  const exists = db.prepare(`SELECT id FROM ${table} WHERE project_id = ? AND id = ?`).get(projectId, id);
  if (!exists) throw new StoreError(404, `${kind} ${id} not found`);

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
    values.push(projectId, id);
    db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE project_id = ? AND id = ?`).run(...values);
  }

  clearVideo(projectId);
  return loadProject(projectId);
}

function rewriteIds(
  projectId: string,
  table: 'scenes' | 'frames',
  column: 'people_ids_json' | 'thing_ids_json',
  dropId: string,
): void {
  const db = getDb();
  const rows = db
    .prepare(`SELECT id, ${column} AS json FROM ${table} WHERE project_id = ?`)
    .all(projectId) as Array<{ id: string; json: string }>;
  const update = db.prepare(`UPDATE ${table} SET ${column} = ? WHERE project_id = ? AND id = ?`);
  for (const row of rows) {
    const ids = parseJson<string[]>(row.json, []).filter((item) => item !== dropId);
    update.run(JSON.stringify(ids), projectId, row.id);
  }
}

export function deleteItem(projectId: string, kind: ImageKind, id: string): Project {
  const db = getDb();
  const table = TABLE[kind];
  const exists = db.prepare(`SELECT id FROM ${table} WHERE project_id = ? AND id = ?`).get(projectId, id);
  if (!exists) throw new StoreError(404, `${kind} ${id} not found`);

  if (kind === 'person') {
    rewriteIds(projectId, 'scenes', 'people_ids_json', id);
    rewriteIds(projectId, 'frames', 'people_ids_json', id);
  } else if (kind === 'thing') {
    rewriteIds(projectId, 'scenes', 'thing_ids_json', id);
    rewriteIds(projectId, 'frames', 'thing_ids_json', id);
  } else if (kind === 'scene') {
    db.prepare(`DELETE FROM frames WHERE project_id = ? AND scene_id = ?`).run(projectId, id);
    removeKindMedia(projectId, ['frame']);
  }

  db.prepare(`DELETE FROM ${table} WHERE project_id = ? AND id = ?`).run(projectId, id);
  clearVideo(projectId);
  return loadProject(projectId);
}
