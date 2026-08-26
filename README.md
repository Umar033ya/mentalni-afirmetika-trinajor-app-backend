# Mental Arithmetic — Backend

Complete REST API backend for the Mental Arithmetic application (Expo/mobile client).
**Node.js + Express + TypeScript + Supabase PostgreSQL**, Render-ready.

```
EXPO APP
   │ HTTPS / REST (JWT)
   ▼
EXPRESS + TS  ── modules: auth, users, profiles, questions, practice,
   │           progression, achievements, challenges, statistics,
   ▼           leaderboard, duels, matches, rating, subscriptions,
SUPABASE        cosmetics, chat, notifications, settings, rewards, admin
PostgreSQL
```

The backend is the single authority for accounts, progression, duels and Pro status.
Question *generation* happens locally in Expo from a shared config; the backend validates
configs, synchronizes duel start times, accepts answers, computes XP/levels/rating.

---

## Setup (step by step)

### STEP 1 — Create a Supabase project

Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
Pick any name/region; save the database password somewhere safe.

### STEP 2 — Get your credentials

In the dashboard: **Project Settings → API**

| .env variable | Dashboard value |
| --- | --- |
| `SUPABASE_URL` | **Project URL** (`https://xxxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role secret** (API Keys section) |

> ⚠️ **IMPORTANT:** `SUPABASE_SERVICE_ROLE_KEY` is **SERVER ONLY**.
> It bypasses all Row Level Security. Never put it inside Expo/frontend code,
> never commit it, never return it from any endpoint.

### STEP 3 — Create `.env`

```powershell
# Windows PowerShell (project root)
Copy-Item .env.example .env
```

`npm run dev` also creates `.env` automatically if it is missing.

### STEP 4 — Add credentials

Open `.env` and fill in the two Supabase values:

```env
PORT=5000
NODE_ENV=development

SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-real-service-role-key...

JWT_SECRET=            # left empty => a strong dev secret is generated automatically
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:8081
```

If Supabase values are missing, the app prints exactly which variables are required
and stops safely. Fake credentials are never invented.

### STEP 5 — Run migrations

Open **Supabase Dashboard → SQL Editor** and run, in order:

1. contents of `supabase/migrations/001_initial_schema.sql`
2. contents of `supabase/migrations/002_seed_data.sql`

Both scripts are idempotent-safe (`if not exists`, `on conflict do nothing`) and never
drop data.

**Alternative (Supabase CLI), if installed:**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

The CLI is optional — the SQL Editor route works without installing anything.

### STEP 6 — Install & run

```bash
npm install
npm run dev
```

Expected startup output:

```
========================================
 Mental Arithmetic Backend
========================================
Environment: development
Port: 5000
Supabase: configured
JWT: configured

Server: http://localhost:5000
Health: http://localhost:5000/health

========================================
Supabase connection: OK (123ms)
```

### STEP 7 — Test

```powershell
curl http://localhost:5000/health
# {"status":"ok","database":"connected"}
```

If you see `"database":"disconnected"`, check that migrations were run (Step 5) and
that `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are correct. The error printed at
startup is non-secret and tells you what failed.

---

## Scripts (Windows PowerShell / CMD compatible)

| Command | Purpose |
| --- | --- |
| `npm run dev` | Setup check + hot-reload dev server |
| `npm run build` | Type-check + compile to `dist/` |
| `npm start` | Setup check + run compiled server (Render uses this) |
| `npm run setup` | Only create/update `.env` and validate configuration |

No Linux-only shell syntax is used anywhere.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `PORT` | no (default 5000) | Render injects its own value |
| `NODE_ENV` | no (default development) | `production` enables rate limiting globally |
| `SUPABASE_URL` | **yes** | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Server-only key |
| `JWT_SECRET` | **yes** | Auto-generated for development if empty |
| `JWT_EXPIRES_IN` | no (default `7d`) | |
| `CLIENT_URL` | no (default `http://localhost:8081`) | Comma-separated origins; `*` forbidden in production |

## Security model

* Expo talks **only** to Express over HTTPS with a JWT: `Authorization: Bearer <token>`.
* Express uses the service role key server-side; it bypasses RLS but never leaves the backend.
* RLS is enabled on all tables (deny by default). A few SELECT-only policies let Expo use
  Supabase Realtime (own notifications/duels/chat) with the anon key + user JWT.
* Passwords: bcrypt-hashed `password_hash`; never returned by any endpoint.
* helmet, CORS allow-list, rate limits, Zod validation, centralized error handler
  (stack traces hidden in production).

## Deployment (Render)

* Build command: `npm run build`
* Start command: `npm start`
* Add the environment variables in the Render dashboard (no `.env` needed there).
* The server listens on `process.env.PORT || 5000` and exposes `/health`.

## Remaining action required from you

Put the real `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project
into `.env`, then run the two migration files in the SQL Editor. Everything else is ready.
