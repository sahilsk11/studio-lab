import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';

import { runCast, runFrames, runImage, runScenes, runVideo } from './actions.js';
import { MEDIA_DIR, PORT, VIDEO_TIMEOUT_MS } from './config.js';
import { deleteItem, ensureProject, patchItem, patchProject, resetProject } from './store.js';
import type { ImageKind } from './types.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/media', express.static(MEDIA_DIR, { maxAge: '1h', fallthrough: false }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, hasKey: Boolean(process.env.OPENROUTER_API_KEY) });
});

app.get('/api/project', (_req, res) => {
  try {
    res.json({ project: ensureProject() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Load failed' });
  }
});

const patchSchema = z.object({
  idea: z.string().optional(),
  style: z.string().optional(),
  durationSec: z.number().int().min(5).max(120).optional(),
});

app.patch('/api/project', (req, res) => {
  try {
    const input = patchSchema.parse(req.body);
    res.json({ project: patchProject(input) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
});

const resetSchema = z.object({
  style: z.string().optional(),
  durationSec: z.number().int().min(5).max(120).optional(),
});

app.post('/api/project/reset', (req, res) => {
  try {
    const input = resetSchema.parse(req.body ?? {});
    res.json({ project: resetProject(input) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Reset failed' });
  }
});

const ideaSchema = z.object({
  idea: z.string().min(1),
  style: z.string().min(1),
  durationSec: z.number().int().min(5).max(120),
});

app.post('/api/cast', async (req, res) => {
  try {
    const input = ideaSchema.parse(req.body);
    const project = await runCast(input);
    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Cast failed',
      project: safeProject(),
    });
  }
});

app.post('/api/scenes', async (_req, res) => {
  try {
    const project = await runScenes();
    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Scenes failed',
      project: safeProject(),
    });
  }
});

app.post('/api/frames', async (_req, res) => {
  try {
    const project = await runFrames();
    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Frames failed',
      project: safeProject(),
    });
  }
});

const imageSchema = z.object({
  kind: z.enum(['person', 'thing', 'scene', 'frame']),
  id: z.string().min(1),
});

app.post('/api/images', async (req, res) => {
  try {
    const input = imageSchema.parse(req.body);
    const project = await runImage(input.kind as ImageKind, input.id);
    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Image generation failed',
      project: safeProject(),
    });
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

app.patch('/api/item', (req, res) => {
  try {
    const input = itemPatchSchema.parse(req.body);
    const { kind, id, ...patch } = input;
    res.json({ project: patchItem(kind as ImageKind, id, patch) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
});

app.delete('/api/item', (req, res) => {
  try {
    const input = z
      .object({
        kind: z.enum(['person', 'thing', 'scene', 'frame']),
        id: z.string().min(1),
      })
      .parse(req.body);
    res.json({ project: deleteItem(input.kind as ImageKind, input.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Delete failed' });
  }
});

app.post('/api/video', async (req, res) => {
  req.setTimeout(VIDEO_TIMEOUT_MS * 2 + 60_000);
  res.setTimeout(VIDEO_TIMEOUT_MS * 2 + 60_000);
  try {
    const project = await runVideo();
    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Video failed',
      project: safeProject(),
    });
  }
});

function safeProject() {
  try {
    return ensureProject();
  } catch {
    return undefined;
  }
}

app.listen(PORT, () => {
  console.log(`Studio Lab API http://localhost:${PORT}`);
});
