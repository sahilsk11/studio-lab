import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';

import { runCast, runCreateProject, runFrames, runImage, runScenes, runVideo } from './actions.js';
import { MEDIA_DIR, PORT, VIDEO_TIMEOUT_MS } from './config.js';
import {
  CloudflareAccessError,
  createCloudflareAccessVerifier,
  loadCloudflareAccessConfig,
} from './cloudflare-access.js';
import {
  StoreError,
  assertOwnedProject,
  claimOrphanedProjects,
  deleteItem,
  listNamedProjects,
  loadOwnedProject,
  patchItem,
  patchProject,
  resetProject,
} from './store.js';
import type { ImageKind } from './types.js';
import { resolveRequestUser, type User } from './users.js';

type AuthedRequest = express.Request & { user: User };

const cloudflareAccessConfig = loadCloudflareAccessConfig(process.env);
const cloudflareAccess = cloudflareAccessConfig
  ? createCloudflareAccessVerifier(cloudflareAccessConfig)
  : null;

const corsOrigin = process.env.CORS_ALLOWED_ORIGIN?.trim();
const app = express();
app.use(corsOrigin ? cors({ origin: corsOrigin }) : cors());
app.use(express.json({ limit: '2mb' }));

function healthPayload(_req: express.Request, res: express.Response) {
  res.json({ ok: true, hasKey: Boolean(process.env.OPENROUTER_API_KEY) });
}

app.get('/health', healthPayload);
app.get('/healthz', healthPayload);

function attachUser(req: express.Request, identity: { email?: string; sub?: string } | null) {
  const user = resolveRequestUser(identity);
  claimOrphanedProjects(user.id);
  (req as AuthedRequest).user = user;
}

app.use(async (req, res, next) => {
  if (!cloudflareAccess) {
    attachUser(req, null);
    next();
    return;
  }

  try {
    const identity = await cloudflareAccess.verify(req.headers);
    attachUser(req, {
      email: identity.email,
      sub: typeof identity.sub === 'string' ? identity.sub : undefined,
    });
    next();
  } catch (error) {
    if (error instanceof CloudflareAccessError) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    next(error);
  }
});

app.use('/media', express.static(MEDIA_DIR, { maxAge: '1h', fallthrough: false }));

function userOf(req: express.Request): User {
  return (req as AuthedRequest).user;
}

function projectIdParam(req: express.Request): string {
  return z.string().uuid().parse(req.params.id);
}

function ownedId(req: express.Request): string {
  const id = projectIdParam(req);
  assertOwnedProject(id, userOf(req).id);
  return id;
}

function sendError(res: express.Response, err: unknown, fallback: string) {
  if (err instanceof StoreError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid request' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : fallback });
}

app.get('/api/projects', (req, res) => {
  try {
    res.json({ projects: listNamedProjects(userOf(req).id) });
  } catch (err) {
    sendError(res, err, 'List failed');
  }
});

const ideaSchema = z.object({
  idea: z.string().min(1),
  style: z.string().min(1),
  durationSec: z.number().int().min(5).max(120),
});

app.post('/api/projects', async (req, res) => {
  try {
    const input = ideaSchema.parse(req.body);
    const project = await runCreateProject({ userId: userOf(req).id, ...input });
    res.json({ project });
  } catch (err) {
    sendError(res, err, 'Create failed');
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    res.json({ project: loadOwnedProject(ownedId(req), userOf(req).id) });
  } catch (err) {
    sendError(res, err, 'Load failed');
  }
});

const patchSchema = z.object({
  idea: z.string().optional(),
  style: z.string().optional(),
  durationSec: z.number().int().min(5).max(120).optional(),
});

app.patch('/api/projects/:id', (req, res) => {
  try {
    const id = ownedId(req);
    const input = patchSchema.parse(req.body);
    res.json({ project: patchProject(id, input) });
  } catch (err) {
    sendError(res, err, 'Update failed');
  }
});

const resetSchema = z.object({
  style: z.string().optional(),
  durationSec: z.number().int().min(5).max(120).optional(),
});

app.post('/api/projects/:id/reset', (req, res) => {
  try {
    const id = ownedId(req);
    const input = resetSchema.parse(req.body ?? {});
    res.json({ project: resetProject(id, input) });
  } catch (err) {
    sendError(res, err, 'Reset failed');
  }
});

app.post('/api/projects/:id/cast', async (req, res) => {
  try {
    const id = ownedId(req);
    const input = ideaSchema.parse(req.body);
    const project = await runCast(id, input);
    res.json({ project });
  } catch (err) {
    sendError(res, err, 'Cast failed');
  }
});

app.post('/api/projects/:id/scenes', async (req, res) => {
  try {
    const project = await runScenes(ownedId(req));
    res.json({ project });
  } catch (err) {
    sendError(res, err, 'Scenes failed');
  }
});

app.post('/api/projects/:id/frames', async (req, res) => {
  try {
    const project = await runFrames(ownedId(req));
    res.json({ project });
  } catch (err) {
    sendError(res, err, 'Frames failed');
  }
});

const imageSchema = z.object({
  kind: z.enum(['person', 'thing', 'scene', 'frame']),
  id: z.string().min(1),
});

app.post('/api/projects/:id/images', async (req, res) => {
  try {
    const projectId = ownedId(req);
    const input = imageSchema.parse(req.body);
    const project = await runImage(projectId, input.kind as ImageKind, input.id);
    res.json({ project });
  } catch (err) {
    sendError(res, err, 'Image generation failed');
  }
});

const itemPatchSchema = z.object({
  kind: z.enum(['person', 'thing', 'scene', 'frame']),
  id: z.string().min(1),
  name: z.string().optional(),
  role: z.string().optional(),
  look: z.string().optional(),
  title: z.string().optional(),
  action: z.string().optional(),
  camera: z.string().optional(),
});

app.patch('/api/projects/:id/item', (req, res) => {
  try {
    const projectId = ownedId(req);
    const input = itemPatchSchema.parse(req.body);
    const { kind, id, ...patch } = input;
    res.json({ project: patchItem(projectId, kind as ImageKind, id, patch) });
  } catch (err) {
    sendError(res, err, 'Update failed');
  }
});

app.delete('/api/projects/:id/item', (req, res) => {
  try {
    const projectId = ownedId(req);
    const input = z
      .object({
        kind: z.enum(['person', 'thing', 'scene', 'frame']),
        id: z.string().min(1),
      })
      .parse(req.body);
    res.json({ project: deleteItem(projectId, input.kind as ImageKind, input.id) });
  } catch (err) {
    sendError(res, err, 'Delete failed');
  }
});

app.post('/api/projects/:id/video', async (req, res) => {
  req.setTimeout(VIDEO_TIMEOUT_MS * 2 + 60_000);
  res.setTimeout(VIDEO_TIMEOUT_MS * 2 + 60_000);
  try {
    const project = await runVideo(ownedId(req));
    res.json({ project });
  } catch (err) {
    sendError(res, err, 'Video failed');
  }
});

const host = process.env.HOST ?? '0.0.0.0';
app.listen(PORT, host, () => {
  console.log(`Studio Lab API http://${host}:${PORT}`);
});
