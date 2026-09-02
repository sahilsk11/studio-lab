import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { DATA_DIR, DB_PATH, MEDIA_DIR } from './config.js';

const SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  idea TEXT NOT NULL,
  style TEXT NOT NULL,
  style_notes TEXT NOT NULL DEFAULT '',
  duration_sec INTEGER NOT NULL,
  video_ready INTEGER NOT NULL DEFAULT 0,
  video_poster_path TEXT,
  video_path TEXT,
  video_rev INTEGER NOT NULL DEFAULT 0,
  video_error TEXT,
  total_cost REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS people (
  project_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  look TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_status TEXT NOT NULL DEFAULT 'pending',
  image_path TEXT,
  image_cost REAL,
  image_error TEXT,
  image_stale INTEGER NOT NULL DEFAULT 0,
  image_rev INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS things (
  project_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  look TEXT NOT NULL,
  views_json TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_status TEXT NOT NULL DEFAULT 'pending',
  image_path TEXT,
  image_cost REAL,
  image_error TEXT,
  image_stale INTEGER NOT NULL DEFAULT 0,
  image_rev INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scenes (
  project_id TEXT NOT NULL,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  look TEXT NOT NULL,
  people_ids_json TEXT NOT NULL,
  thing_ids_json TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_status TEXT NOT NULL DEFAULT 'pending',
  image_path TEXT,
  image_cost REAL,
  image_error TEXT,
  image_stale INTEGER NOT NULL DEFAULT 0,
  image_rev INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS frames (
  project_id TEXT NOT NULL,
  id TEXT NOT NULL,
  scene_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  people_ids_json TEXT NOT NULL,
  thing_ids_json TEXT NOT NULL,
  action TEXT NOT NULL,
  camera TEXT NOT NULL,
  image_status TEXT NOT NULL DEFAULT 'pending',
  image_path TEXT,
  image_cost REAL,
  image_error TEXT,
  image_stale INTEGER NOT NULL DEFAULT 0,
  image_rev INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
`;

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

function migrate(database: DatabaseSync): void {
  const cols = database.prepare('PRAGMA table_info(projects)').all() as Array<{ name: string }>;
  const have = new Set(cols.map((col) => col.name));
  if (!have.has('video_path')) database.exec('ALTER TABLE projects ADD COLUMN video_path TEXT');
  if (!have.has('video_rev')) {
    database.exec('ALTER TABLE projects ADD COLUMN video_rev INTEGER NOT NULL DEFAULT 0');
  }
  if (!have.has('video_error')) database.exec('ALTER TABLE projects ADD COLUMN video_error TEXT');
  if (!have.has('video_phase')) {
    database.exec(`ALTER TABLE projects ADD COLUMN video_phase TEXT NOT NULL DEFAULT 'idle'`);
  }
  if (!have.has('video_clip_index')) {
    database.exec('ALTER TABLE projects ADD COLUMN video_clip_index INTEGER');
  }
  if (!have.has('video_clip_total')) {
    database.exec('ALTER TABLE projects ADD COLUMN video_clip_total INTEGER');
  }
  if (!have.has('video_started_at')) {
    database.exec('ALTER TABLE projects ADD COLUMN video_started_at INTEGER');
  }
}
