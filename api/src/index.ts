import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';

import { runCast, runCreateProject, runFrames, runImage, runScenes, runVideo } from './actions.js';
import { MEDIA_DIR, PORT, VIDEO_TIMEOUT_MS } from './config.js';
import {
  anonymousSessionFromHeaders,
  bearerFromHeaders,
  ClerkAuthError,
  createClerkVerifier,
  loadClerkConfig,
} from './clerk-auth.js';
import {
  CloudflareAccessError,
  createCloudflareAccessVerifier,
  loadCloudflareAccessConfig,
} from './cloudflare-access.js';
import {
  StoreError,
  assertOwnedProject,
  claimAnonymousProjects,
  deleteItem,
  listNamedProjects,
  loadOwnedProject,
  patchItem,
  patchProject,
  resetProject,
  type ProjectOwner,
} from './store.js';
import type { ImageKind } from './types.js';
import { ensureLocalUser, resolveRequestUser, upsertClerkUser, type User } from './users.js';

type RequestAuth = {
  user: User | null;
  owner: ProjectOwner | null;
  isAuthenticated: boolean;
};

type AuthedRequest = express.Request & { auth: RequestAuth };

const cloudflareAccessConfig = loadCloudflareAccessConfig(process.env);
const cloudflareAccess = cloudflareAccessConfig
  ? createCloudflareAccessVerifier(cloudflareAccessConfig)
  : null;

const clerkConfig = loadClerkConfig(process.env);
const clerkAuth = clerkConfig ? createClerkVerifier(clerkConfig) : null;

const corsOrigin = process.env.CORS_ALLOWED_ORIGIN?.trim();
const app = express();
app.use(corsOrigin ? cors({ origin: corsOrigin }) : cors());
app.use(express.json({ limit: '2mb' }));

function healthPayload(_req: express.Request, res: express.Response) {
  res.json({
    ok: true,
    hasKey: Boolean(process.env.OPENROUTER_API_KEY),
    auth: clerkAuth ? 'clerk' : 'local',
  });
}

app.get('/health', healthPayload);
app.get('/healthz', healthPayload);

async function resolveAuth(
  headers: Record<string, string | string[] | undefined>,
  accessIdentity: { email?: string; sub?: string } | null,
): Promise<RequestAuth> {
  const anonymousSession = anonymousSessionFromHeaders(headers);

  if (clerkAuth) {
    try {
      const identity = await clerkAuth.verify(bearerFromHeaders(headers));
      const user = upsertClerkUser(identity);
      if (anonymousSession) claimAnonymousProjects(user.id, anonymousSession);
      return {
        user,
        owner: { kind: 'user', userId: user.id },
        isAuthenticated: true,
      };
    } catch (error) {
      if (!(error instanceof ClerkAuthError)) throw error;
    }

    if (anonymousSession) {
      return { user: null, owner: { kind: 'anonymous', sessionId: anonymousSession }, isAuthenticated: false };
    }

    return { user: null, owner: null, isAuthenticated: false };
  }

  if (accessIdentity) {
    const user = resolveRequestUser(accessIdentity);
    return { user, owner: { kind: 'user', userId: user.id }, isAuthenticated: true };
  }

  const user = ensureLocalUser();
  return { user, owner: { kind: 'user', userId: user.id }, isAuthenticated: true };
}

app.use(async (req, res, next) => {
  let accessIdentity: { email?: string; sub?: string } | null = null;

  if (cloudflareAccess) {
    try {
      const identity = await cloudflareAccess.verify(req.headers);
      accessIdentity = {
        email: identity.email,
        sub: typeof identity.sub === 'string' ? identity.sub : undefined,
      };
    } catch (error) {
      if (error instanceof CloudflareAccessError) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }
      next(error);
      return;
    }
  }

  try {
    (req as AuthedRequest).auth = await resolveAuth(req.headers, accessIdentity);
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/media', express.static(MEDIA_DIR, { maxAge: '1h', fallthrough: false }));

function authOf(req: express.Request): RequestAuth {
  return (req as AuthedRequest).auth;
}

function requireOwner(req: express.Request, res: express.Response): ProjectOwner | null {
  const owner = authOf(req).owner;
  if (!owner) {
    res.status(401).json({ error: 'session_required', message: 'Anonymous session required' });
    return null;
  }
  return owner;
}

function requireSignedIn(req: express.Request, res: express.Response): boolean {
  if (authOf(req).isAuthenticated) return true;
  res.status(401).json({
    error: 'sign_in_required',
    message: 'Sign in to generate video',
  });
  return false;
}

function projectIdParam(req: express.Request): string {
  return z.string().uuid().parse(req.params.id);
}

function ownedId(req: express.Request, res: express.Response): string | null {
  const owner = requireOwner(req, res);
  if (!owner) return null;
  try {
    const id = projectIdParam(req);
    assertOwnedProject(id, owner);
    return id;
  } catch (err) {
    sendError(res, err, 'Project not found');
    return null;
  }
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

app.get('/api/me', (req, res) => {
  const { user, isAuthenticated } = authOf(req);
  res.json({
    authenticated: isAuthenticated,
    user: user
      ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        }
      : null,
  });
});

app.get('/api/projects', (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  try {
    res.json({ projects: listNamedProjects(owner) });
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
  const owner = requireOwner(req, res);
  if (!owner) return;
  try {
    const input = ideaSchema.parse(req.body);
    const project = await runCreateProject({ owner, ...input });
    res.json({ project });
  } catch (err) {
    sendError(res, err, 'Create failed');
  }
});

app.get('/api/projects/:id', (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  try {
    const id = projectIdParam(req);
    res.json({ project: loadOwnedProject(id, owner) });
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
  const id = ownedId(req, res);
  if (!id) return;
  try {
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
  const id = ownedId(req, res);
  if (!id) return;
  try {
    const input = resetSchema.parse(req.body ?? {});
    res.json({ project: resetProject(id, input) });
  } catch (err) {
    sendError(res, err, 'Reset failed');
  }
});

app.post('/api/projects/:id/cast', async (req, res) => {
  const id = ownedId(req, res);
  if (!id) return;
  try {
    const input = ideaSchema.parse(req.body);
    const project = await runCast(id, input);
    res.json({ project });
  } catch (err) {
    sendError(res, err, 'Cast failed');
  }
});

app.post('/api/projects/:id/scenes', async (req, res) => {
  const id = ownedId(req, res);
  if (!id) return;
  try {
    const project = await runScenes(id);
    res.json({ project });
  } catch (err) {
    sendError(res, err, 'Scenes failed');
  }
});

app.post('/api/projects/:id/frames', async (req, res) => {
  const id = ownedId(req, res);
  if (!id) return;
  try {
    const project = await runFrames(id);
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
  const projectId = ownedId(req, res);
  if (!projectId) return;
  try {
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
  const projectId = ownedId(req, res);
  if (!projectId) return;
  try {
    const input = itemPatchSchema.parse(req.body);
    const { kind, id, ...patch } = input;
    res.json({ project: patchItem(projectId, kind as ImageKind, id, patch) });
  } catch (err) {
    sendError(res, err, 'Update failed');
  }
});

app.delete('/api/projects/:id/item', (req, res) => {
  const projectId = ownedId(req, res);
  if (!projectId) return;
  try {
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
  if (!requireSignedIn(req, res)) return;

  req.setTimeout(VIDEO_TIMEOUT_MS * 2 + 60_000);
  res.setTimeout(VIDEO_TIMEOUT_MS * 2 + 60_000);
  const id = ownedId(req, res);
  if (!id) return;
  try {
    const project = await runVideo(id);
    res.json({ project });
  } catch (err) {
    sendError(res, err, 'Video failed');
  }
});

const host = process.env.HOST ?? '0.0.0.0';
app.listen(PORT, host, () => {
  console.log(`Studio Lab API http://${host}:${PORT}`);
});