-- Enable Row-Level Security on every table in `public`.
--
-- The app only ever queries through Prisma using DATABASE_URL/DIRECT_URL,
-- which authenticate as the table owner and therefore bypass RLS as usual --
-- this migration does not change app behavior.
--
-- What it does change: Supabase's auto-generated PostgREST API is exposed
-- for every project by default and, without RLS, serves any table in
-- `public` (including Account.refresh_token/access_token and
-- Session.sessionToken) to anyone holding the project's anon key. With RLS
-- enabled and no policies defined, that API path is denied by default while
-- the owner-authenticated Prisma connection is unaffected.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Game" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rating" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SteamLibraryLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OwnedGame" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IgdbBatchLog" ENABLE ROW LEVEL SECURITY;

-- Prisma's own migration-tracking table also lives in `public`, so it is
-- served by the same PostgREST path and flagged by the advisor. Prisma
-- connects as the table owner and bypasses RLS, so `migrate deploy` keeps
-- recording migrations here normally.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
