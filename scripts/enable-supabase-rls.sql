-- Supabase: fix "rls_disabled_in_public" — run once in SQL Editor (Dashboard → SQL).
--
-- Why: Supabase exposes `public` tables to PostgREST. Without RLS, the anon key could
-- theoretically read/write those tables. This app uses Prisma + DATABASE_URL only;
-- the migration owner (usually `postgres`) bypasses RLS, so your Next.js routes keep working.
--
-- Do NOT add permissive policies for anon/authenticated unless you intentionally use
-- supabase-js against these tables. With RLS on and no policies, API access is denied.
--
-- If anything breaks (rare with a non-owner DB user), check the role in DATABASE_URL
-- and ensure it owns the tables or has BYPASSRLS.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MountFarmAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MountLockoutCompletion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MountCollectionSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MountComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MountListingVote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MountListingAlertSent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MountListingCommunityAggregate" ENABLE ROW LEVEL SECURITY;
