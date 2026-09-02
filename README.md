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

## Git and runtime data

Commit source, package manifests/lockfiles, configuration templates, and bundled placeholder assets. Do not commit API keys, local `.env` files, SQLite databases, generated media, dependency directories, or Expo build output.
