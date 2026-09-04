# Studio Lab

Studio Lab is an Expo frontend and a Node/Express API for turning an idea into a generated short video: idea → cast → scenes → frames → video.

## Project layout

- `frontend/` — Expo Router app for web, iOS, and Android.
- `api/` — Express API with SQLite persistence, generated media storage, OpenRouter calls, and video assembly.

The two packages are intentionally independent. There is no root package manager; install and run each package from its own directory.

## Requirements

- Node.js 22 or newer
- An OpenRouter API key for live generation
- `ffmpeg` on the API host for multi-clip video assembly

## Configuration

The API reads configuration from `api/.env`:

```dotenv
OPENROUTER_API_KEY=your-key
PORT=3001
```

The frontend optionally reads `frontend/.env`:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3001
```

Both `.env` files are ignored by Git. Use the checked-in `.env.example` files as templates. API runtime state (SQLite and generated media) lives in `api/data/` and is also ignored.

## Run locally

Start the API in one terminal:

```bash
cd api
npm install
npm run dev
```

Start the Expo frontend in another terminal:

```bash
cd frontend
npm install
npm run web
```

Open the URL printed by Expo. The frontend defaults to `http://localhost:3001` for the API; set `EXPO_PUBLIC_API_URL` if the API is hosted elsewhere.

The app also has a demo mode that uses bundled placeholder assets and does not require an API key.

## Production deploy

Architecture mirrors [ag-job-hunt](https://github.com/sahilsk11/ag-job-hunt): Cloudflare Access on the frontend hostname, Pages Functions proxy same-origin `/api/*` and `/media/*` to Fly.io, API verifies the forwarded Access JWT.

**Continuous deployment:** pushes to `main` run [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — verify frontend and API, then deploy the Fly app (`studio-lab`) and Cloudflare Pages project (`studiolab`). Required GitHub repository secrets: `FLY_API_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Manual `fly deploy` and ad-hoc `wrangler pages deploy` still work as fallbacks.

| Component | Config | Host |
|---|---|---|
| Frontend | `frontend/wrangler.toml` | `https://studiolab.ultron.sh` |
| Pages Functions | `frontend/functions/` | Proxies to Fly with JWT |
| API | `api/fly.toml`, `api/Dockerfile` | `https://studio-lab.fly.dev` (internal; browser never calls this) |

### Build commands

```bash
# Frontend static export (Cloudflare Pages)
cd frontend
npm ci
EXPO_PUBLIC_API_URL= npm run export:web   # empty = same-origin /api

# API Docker image (Fly.io)
cd api
docker build -t studio-lab-api .
```

### Operator steps (outside the repo)

#### 1. Fly.io API

```bash
cd api
fly apps create studio-lab          # if not exists
fly volumes create studio_lab_data --region iad --size 1
fly secrets set CLOUDFLARE_ACCESS_AUD="<AUD from Access app for studiolab.ultron.sh>"
# OPENROUTER_API_KEY is optional until generation is needed:
# fly secrets set OPENROUTER_API_KEY="sk-or-..."
fly deploy
```

Find the Access application AUD in Cloudflare Zero Trust → Access → Applications → the **studiolab** app (not the `*.ultron.sh` wildcard). `CLOUDFLARE_ACCESS_TEAM_DOMAIN` is already set in `fly.toml` to `https://sahilagentserver.cloudflareaccess.com`.

If the UI loads after Access login but API calls show **Failed to fetch**, check:

1. Fly `CLOUDFLARE_ACCESS_AUD` matches the **studiolab** app AUD (not the wildcard).
2. Settings → Studio API is not still set to `http://localhost:3001` from local dev.
3. The deployed frontend sends `credentials: 'include'` on API fetches so the `CF_Authorization` cookie reaches Pages Functions.

#### 2. Cloudflare Pages

The Pages project name is `studiolab` (direct upload via CI, not Git integration).

1. Create a Pages project named `studiolab` if it does not exist (direct upload / no Git source).
2. **Custom domain:** `studiolab.ultron.sh`
3. Ensure the Access policy on `*.ultron.sh` includes this hostname (should inherit from wildcard).
4. `API_ORIGIN` in `frontend/wrangler.toml` points at `https://studio-lab.fly.dev`; override in the Pages dashboard if the Fly app name differs.

CI builds from `frontend/` with `EXPO_PUBLIC_API_URL= npm run export:web` and deploys `dist/` plus `frontend/functions/` via Wrangler.

#### 3. Verify

- `GET https://studiolab.ultron.sh/health` → `{"ok":true,...}` (via Pages proxy, after Access login)
- `GET https://studio-lab.fly.dev/health` → 200 without JWT (Fly health check)
- `GET https://studio-lab.fly.dev/api/projects` without JWT → 401
- SPA loads at `https://studiolab.ultron.sh` and API calls stay same-origin

## Git and runtime data

Commit source, package manifests/lockfiles, configuration templates, and bundled placeholder assets. Do not commit API keys, local `.env` files, SQLite databases, generated media, dependency directories, or Expo build output.
