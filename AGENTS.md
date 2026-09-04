# Studio Lab

Studio Lab is an AI storyboard-to-video generator with two independent Node/TypeScript apps:

- `api/` — Express + TypeScript backend (`studio-lab-api`), port `3001`. Orchestrates all AI calls, persists state in an embedded SQLite DB, and serves generated media.
- `frontend/` — Expo / React Native (Web) client (`studio-lab-frontend`), Metro/Expo on port `8081`. Talks to the API over HTTP.

## Cursor Cloud specific instructions

### Services and how to run them

| Service | Directory | Dev command | Port |
|---|---|---|---|
| API (Express) | `api/` | `npm run dev` (`tsx watch`) | 3001 |
| Frontend (Expo Web) | `frontend/` | `npm run web` (or `npm start` for device/simulator) | 8081 |

Start the API before the frontend. Both are started as long-running dev servers (not part of the update script).

### Lint / test / typecheck

- No ESLint configs. Run `npm run typecheck` and `npm run test` inside `api/` and `frontend/` separately.
- API tests cover optional Cloudflare Access JWT verification and Clerk/anonymous auth middleware.
- Frontend tests cover Pages Functions (`functions/_lib/*`) for Fly proxying.

### Production deploy (Cloudflare Pages + Fly.io)

Production hostname: **https://studiolab.ultron.sh** (public; Clerk gates video generation).

| Layer | Host | Notes |
|---|---|---|
| Frontend | Cloudflare Pages (`frontend/wrangler.toml`) | Static Expo web export → `dist/` |
| API proxy | Pages Functions `/api/*`, `/media/*`, `/health` | Forwards Clerk + anonymous session headers to Fly |
| API | Fly.io app `studio-lab` (`api/fly.toml`) | SQLite + media on `/data` volume |

**Local dev** uses `http://localhost:3001` directly (Access verification disabled unless `CLOUDFLARE_ACCESS_*` env vars are set).

**Production frontend build** sets `EXPO_PUBLIC_API_URL=` (empty) so the SPA calls same-origin `/api/*` through Pages Functions — never `*.fly.dev` from the browser.

See `README.md` for operator steps (Fly launch, volume, secrets, Pages project).

### OpenRouter API key (required for real generation)

- Real AI generation (storyboard text, images, video) goes through OpenRouter and requires `OPENROUTER_API_KEY`, read from `api/.env` (gitignored) or the process environment.
- Gotcha: a dev server started in a shell/tmux session that predates a newly-injected secret will NOT see it (`/health` shows `hasKey:false`). Put the key in `api/.env` and/or restart `npm run dev` from a fresh shell so it is picked up.
- Without the key the API still boots and `GET /health` returns `{"ok":true,"hasKey":false}`, but the generation endpoints (`/api/cast`, `/api/scenes`, `/api/frames`, `/api/images`, `/api/video`) fail with `"OPENROUTER_API_KEY is not set"`.
- To exercise the full pipeline end-to-end WITHOUT a key, enable the frontend's **Demo mode** (Settings → Developer → "Demo mode"). It swaps in bundled sample assets and skips all API calls, so the whole idea → cast → scenes → frames → images → video flow works offline.

### Environment / gotchas

- `.env` files are optional: the API defaults to `PORT=3001` and the frontend defaults `EXPO_PUBLIC_API_URL` to `http://localhost:3001`, so the two connect out of the box. Copy `api/.env.example` / `frontend/.env.example` only when overriding defaults (e.g. adding the OpenRouter key). `api/.env` is gitignored.
- The backend uses Node's built-in `node:sqlite` (`DatabaseSync`), which requires Node ≥ 22.5 and prints a harmless `ExperimentalWarning: SQLite is an experimental feature` on startup. The VM's Node (v22.14) works.
- SQLite DB is auto-created at `api/data/studio-lab.db` and generated media under `api/data/media/` (both gitignored); no separate database process is needed.
- `ffmpeg` is only invoked to stitch multi-clip videos longer than 30s (`durationSec > 30`); it is not required for the default 30s (single-clip) flow.
- Frontend note: this repo pins Expo SDK 57 — see `frontend/AGENTS.md` (read the versioned Expo v57 docs before changing frontend code).
