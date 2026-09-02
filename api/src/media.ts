import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { MEDIA_DIR } from './config.js';
import type { ImageKind } from './types.js';

const execFileAsync = promisify(execFile);

export function saveImageFile(
  projectId: string,
  kind: ImageKind,
  id: string,
  base64: string,
  mediaType: string,
): string {
  const ext = mediaType.includes('jpeg') || mediaType.includes('jpg') ? 'jpg' : 'png';
  const rel = path.posix.join(projectId, kind, `${id}.${ext}`);
  const abs = path.join(MEDIA_DIR, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, Buffer.from(base64, 'base64'));
  return rel;
}

export function saveVideoFile(projectId: string, buffer: Buffer, name = 'reel.mp4'): string {
  const rel = path.posix.join(projectId, 'video', name);
  const abs = path.join(MEDIA_DIR, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, buffer);
  return rel;
}

export async function concatVideoFiles(relPaths: string[], outRel: string): Promise<void> {
  if (relPaths.length === 0) throw new Error('No clips to concatenate');
  const outAbs = path.join(MEDIA_DIR, outRel);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  if (relPaths.length === 1) {
    fs.copyFileSync(path.join(MEDIA_DIR, relPaths[0]), outAbs);
    return;
  }

  const listPath = `${outAbs}.txt`;
  const lines = relPaths.map((rel) => {
    const abs = path.join(MEDIA_DIR, rel).replace(/'/g, "'\\''");
    return `file '${abs}'`;
  });
  fs.writeFileSync(listPath, lines.join('\n'));

  try {
    try {
      await execFileAsync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outAbs], {
        timeout: 120_000,
      });
    } catch {
      await execFileAsync(
        'ffmpeg',
        ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', outAbs],
        { timeout: 300_000 },
      );
    }
  } finally {
    fs.rmSync(listPath, { force: true });
  }
}

export function readImageDataUri(relPath: string | null | undefined): string | undefined {
  if (!relPath) return undefined;
  const abs = path.join(MEDIA_DIR, relPath);
  if (!fs.existsSync(abs)) return undefined;
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const mediaType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mediaType};base64,${buf.toString('base64')}`;
}

export function removeKindMedia(projectId: string, kinds: ImageKind[]): void {
  for (const kind of kinds) {
    fs.rmSync(path.join(MEDIA_DIR, projectId, kind), { recursive: true, force: true });
  }
}

export function removeVideoMedia(projectId: string): void {
  fs.rmSync(path.join(MEDIA_DIR, projectId, 'video'), { recursive: true, force: true });
}

export function removeProjectMedia(projectId: string): void {
  fs.rmSync(path.join(MEDIA_DIR, projectId), { recursive: true, force: true });
}

export function mediaUrl(relPath: string | null | undefined, rev: number): string | undefined {
  if (!relPath) return undefined;
  return `/media/${relPath}?v=${rev}`;
}
