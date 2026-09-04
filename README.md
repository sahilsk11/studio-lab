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

Public app at **https://studiolab.ultron.sh**: Cloudflare Pages serves the Expo web export; Pages Functions proxy same-origin `/api/*` and `/media/*` to Fly.io. **Clerk** handles sign-in; video generation (`POST /api/projects/:id/video`) requires a Clerk session. Anonymous sessions (`X-Anonymous-Session`) cover the rest of the pipeline.

**Continuous deployment:** pushes to `main` run [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — verify frontend and API, then deploy the Fly app (`studio-lab`) and Cloudflare Pages project (`studiolab`). Required GitHub repository secrets: `FLY_API_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, and Fly secret `CLERK_SECRET_KEY`. Manual `fly deploy` and ad-hoc `wrangler pages deploy` still work as fallbacks.

| Component | Config | Host |
|---|---|---|
| Frontend | `frontend/wrangler.toml` | `https://studiolab.ultron.sh` |
| Pages Functions | `frontend/functions/` | Proxies `/api/*` and `/media/*` to Fly |
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
fly secrets set CLERK_SECRET_KEY="sk_live_..."
# OPENROUTER_API_KEY is optional until generation is needed:
# fly secrets set OPENROUTER_API_KEY="sk-or-..."
fly deploy
```

Cloudflare Access on the API is **optional** (set both `CLOUDFLARE_ACCESS_AUD` and `CLOUDFLARE_ACCESS_TEAM_DOMAIN` only if re-enabling beta gating). For the public launch, unset any leftover beta secret:

```bash
fly secrets unset CLOUDFLARE_ACCESS_AUD
```

#### 2. Cloudflare Pages

The Pages project name is `studiolab` (direct upload via CI, not Git integration).

1. Create a Pages project named `studiolab` if it does not exist (direct upload / no Git source).
2. **Custom domain:** `studiolab.ultron.sh`
3. In [sahilsk11/cloudflare](https://github.com/sahilsk11/cloudflare), ensure the studiolab Access apps **bypass** (public) so `*.ultron.sh` wildcard gating does not block the hostname.
4. `API_ORIGIN` in `frontend/wrangler.toml` points at `https://studio-lab.fly.dev`; override in the Pages dashboard if the Fly app name differs.

CI builds from `frontend/` with `EXPO_PUBLIC_API_URL= npm run export:web` and deploys `dist/` plus `frontend/functions/` via Wrangler.

#### 3. Verify

- `GET https://studiolab.ultron.sh/health` → `{"ok":true,...}` (no Access login)
- `GET https://studio-lab.fly.dev/health` → 200
- SPA loads at `https://studiolab.ultron.sh`; API calls stay same-origin
- Video generation prompts Clerk sign-in; other steps work with an anonymous session

## Git and runtime data

Commit source, package manifests/lockfiles, configuration templates, and bundled placeholder assets. Do not commit API keys, local `.env` files, SQLite databases, generated media, dependency directories, or Expo build output.
