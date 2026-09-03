import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(SRC_DIR, '..');
export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? path.join(ROOT_DIR, 'data'));
export const DB_PATH = path.join(DATA_DIR, 'studio-lab.db');
export const MEDIA_DIR = path.join(DATA_DIR, 'media');

export const PORT = Number(process.env.PORT ?? 3001);

export const DEFAULT_IDEA =
  'A barista discovers their latte art comes alive at midnight and starts a tiny revolution in the coffee shop.';
export const DEFAULT_STYLE = 'Cinematic';
export const DEFAULT_DURATION = 30;

/** Cheap + fast for storyboard text */
export const STORYBOARD_MODEL = 'google/gemini-2.5-flash';

/**
 * Seedream 4.5: flat $0.04/image, 9:16, batch up to n=10, 14 refs for consistency.
 * Best fit for storyboard panels on OpenRouter today.
 */
export const IMAGE_MODEL = 'bytedance-seed/seedream-4.5';

/** Seedream 4.5 needs ≥3.7MP; 1K @ 9:16 is too small — use 2K */
export const IMAGE_RESOLUTION = '2K' as const;
export const IMAGE_ASPECT_RATIO = '9:16' as const;
export const SHEET_ASPECT_RATIO = '16:9' as const;
export const IMAGE_MAX_REFS = 14;

/**
 * Wan 3.0: billed per second (predictable). 480p 9:16 is $0.05/s → $1.50 for 30s.
 * Seedance 2.5 is token-priced and ran ~$7 for one 30s clip — do not use it.
 * Bump VIDEO_RESOLUTION to 720p if you want sharper output ($0.10/s → $3 / 30s).
 */
export const VIDEO_MODEL = 'alibaba/wan-3.0';
export const VIDEO_RESOLUTION = '480p' as const;
export const VIDEO_ASPECT_RATIO = '9:16' as const;
export const VIDEO_MIN_DURATION = 2;
export const VIDEO_MAX_DURATION = 30;
export const VIDEO_SUPPORTS_LAST_FRAME = false;
export const VIDEO_POLL_MS = 8_000;
export const VIDEO_POLL_FETCH_MS = 30_000;
export const VIDEO_TIMEOUT_MS = 15 * 60 * 1000;
