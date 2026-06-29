# MicroMesoMacro (MiMeMa)

Rate games on three axes — **Micro** (execution: reflexes/aim/inputs), **Meso** (reading: situational awareness/tactics), **Macro** (strategy: long-term planning/resource management) — and see how your rating compares to the crowd.

This is the **MVP infrastructure scaffold**. Scope is intentionally narrow:
1. View your Steam library.
2. Link your Steam account.
3. Rate a game on the three sliders and see the crowd average.
4. See crowd average vs. your own rating for each game in your library.

**Deferred to a later phase** (not built yet): bias/deviation analysis, archetype labels, library-engagement cross-referencing, similar-games/similarity, the advanced tag+range search page, classic games (chess/Wikipedia seed), email/magic-link login.

## Setup

Requires Node ≥20.9 (this project targets 22 LTS) and a Postgres database — using [Supabase](https://supabase.com) for this (see note below on which connection string to use).

1. `cp .env.example .env` and fill in:
   - `DATABASE_URL` — your Supabase **transaction pooler** connection string (Project Settings → Database → Connect → "Transaction pooler" tab, port `6543`), with `?pgbouncer=true&connection_limit=1` appended. This is what the app queries at runtime — it's built for many short-lived connections, which matters once you're on Vercel: each concurrent serverless function instance opens its own connection, and a handful of them can blow past a small fixed limit.
   - `DIRECT_URL` — your Supabase **session pooler** connection string (same page, "Session pooler" tab, port `5432`). Only `prisma migrate` uses this — it needs session-level locks the transaction pooler doesn't support, so migrations would hang on port `6543`. The **direct connection** (`db.<ref>.supabase.co:5432`) is a third option but is IPv6-only and unreachable from many networks, so neither URL should point there.
   - `STEAM_API_KEY` ([get one here](https://steamcommunity.com/dev/apikey)).
   - `IGDB_CLIENT_ID`/`IGDB_CLIENT_SECRET` (register a Twitch dev app at [dev.twitch.tv](https://dev.twitch.tv/console/apps), enable IGDB access).
2. `npm install`
3. `npx prisma migrate dev --name init` — creates the schema (only needed once per fresh database; already applied to the project's current Supabase instance).
4. `npm run dev` — open [http://localhost:3000](http://localhost:3000).

A local Postgres via Docker (`docker-compose.yml`) is included as an alternative if you'd rather not depend on Supabase — swap `DATABASE_URL` and `DIRECT_URL` to the values in `.env.example`'s commented-out local option (both point at the same local instance, no pooler split needed) and run `docker compose up -d` first.

Sign in via "Connect Steam Library" on the home page (hits `/api/auth/steam`, which does the Steam OpenID 2.0 handshake), then "Sync Steam Library" to pull your owned games.

## Architecture notes

- **Auth**: Auth.js (NextAuth v5) with a single hand-rolled Steam OpenID Credentials provider (`src/auth/`). No OAuth provider exists for Steam, so `/api/auth/steam` performs the OpenID 2.0 redirect/verify dance directly against `steamcommunity.com`, then calls `signIn("steam", ...)` with the verified SteamID. Credentials providers require **JWT session strategy** in Auth.js v5 (database sessions aren't supported for Credentials) — `steamId` is persisted on the `User` row directly instead.
- **Game data**: IGDB is the metadata source of truth; Steam Web API is used only to fetch a user's owned-games list (`GetOwnedGames`), with each appid resolved to an IGDB entry via `external_games`.
- **Crowd averages**: computed on the fly via Prisma `aggregate`, not pre-materialized — fine at MVP scale, revisit with a cached/materialized aggregate if read volume grows.
- **Steam sync**: `POST /api/steam/sync` runs synchronously per request, batched to respect IGDB's ~4 req/sec limit (caps new-game resolution at 20 per sync call). No background worker/queue yet.
