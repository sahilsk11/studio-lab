import { randomUUID } from 'node:crypto';

import { getDb } from './db.js';

export const LOCAL_EXTERNAL_ID = 'local';

export type User = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  externalId: string | null;
};

type UserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  external_id: string | null;
};

function now(): string {
  return new Date().toISOString();
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    externalId: row.external_id,
  };
}

function assertIdentifier(input: {
  email?: string | null;
  phone?: string | null;
  externalId?: string | null;
}): void {
  if (!blankToNull(input.email) && !blankToNull(input.phone) && !blankToNull(input.externalId)) {
    throw new Error('A user needs at least one identifier (email, phone, or external id)');
  }
}

export function ensureLocalUser(): User {
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM users WHERE external_id = ?')
    .get(LOCAL_EXTERNAL_ID) as UserRow | undefined;
  if (existing) return mapUser(existing);

  const ts = now();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, first_name, last_name, email, phone, external_id, created_at, updated_at)
     VALUES (?, NULL, NULL, NULL, NULL, ?, ?, ?)`,
  ).run(id, LOCAL_EXTERNAL_ID, ts, ts);
  return {
    id,
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    externalId: LOCAL_EXTERNAL_ID,
  };
}

export function upsertAccessUser(identity: { email?: string; sub?: string }): User {
  const email = blankToNull(identity.email);
  const externalId = blankToNull(identity.sub);
  assertIdentifier({ email, externalId });

  const db = getDb();
  const byEmail = email
    ? (db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined)
    : undefined;
  if (byEmail) {
    if (externalId && !byEmail.external_id) {
      db.prepare('UPDATE users SET external_id = ?, updated_at = ? WHERE id = ?').run(
        externalId,
        now(),
        byEmail.id,
      );
      return mapUser({ ...byEmail, external_id: externalId });
    }
    return mapUser(byEmail);
  }

  const byExternal = externalId
    ? (db.prepare('SELECT * FROM users WHERE external_id = ?').get(externalId) as UserRow | undefined)
    : undefined;
  if (byExternal) {
    if (email && !byExternal.email) {
      db.prepare('UPDATE users SET email = ?, updated_at = ? WHERE id = ?').run(email, now(), byExternal.id);
      return mapUser({ ...byExternal, email });
    }
    return mapUser(byExternal);
  }

  const ts = now();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, first_name, last_name, email, phone, external_id, created_at, updated_at)
     VALUES (?, NULL, NULL, ?, NULL, ?, ?, ?)`,
  ).run(id, email, externalId, ts, ts);
  return {
    id,
    firstName: null,
    lastName: null,
    email,
    phone: null,
    externalId,
  };
}

export function resolveRequestUser(identity: { email?: string; sub?: string } | null): User {
  if (!identity) return ensureLocalUser();
  return upsertAccessUser(identity);
}
