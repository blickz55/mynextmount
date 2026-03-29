# Epic J.7 — Authenticated accounts & saved collection (MVP)

This note describes what shipped for **identity + persistent collection + account dashboard + weekly plan slice**. The **anonymous paste flow on `/tool` stays primary**; auth is opt-in for save/load and `/account`.

## Production gate

Shipping **auth to production** still follows **`docs/business-strategy.md`** §2 (**F.1**): stability, data surface checks, and operator intent before real user passwords and PII. Local and staging can exercise the stack earlier.

## Stack

- **NextAuth v5** (beta) — Credentials (email + password), JWT sessions, `trustHost: true`.
- **Prisma 6** + **PostgreSQL** (`prisma/schema.prisma`, migrations under `prisma/migrations/`). Runtime uses `DATABASE_URL`; migrations use `DIRECT_URL`. **`npm run build` is `next build` only** — run **`npm run db:migrate`** separately when the schema changes (Vercel’s build VMs often hit **P1001** to Supabase **:5432** pooler even when production **:6543** works).

## Environment

Copy **`.env.example`** into **`.env.local`** (Next.js loads it automatically for `next dev` / `next build`).

| Variable | Required | Purpose |
|----------|----------|---------|
| **`AUTH_SECRET`** | Yes | Signs session cookies. Generate: `openssl rand -base64 32` (Mac/Linux/Git Bash) or any long random string. |
| **`DATABASE_URL`** | Yes | Postgres URI. **Supabase:** use the **transaction pooler** (port **6543**, often with `pgbouncer=true`) for runtime queries. |
| **`DIRECT_URL`** | Yes (for `db:migrate`) | Used only when you run **`npm run db:migrate`** (not during Vercel **`npm run build`**). **Supabase:** **`db.<ref>.supabase.co:5432`** or **session pooler** **`*.pooler.supabase.com:5432`** — whichever your network can reach. **Neon / plain Postgres:** same as `DATABASE_URL` if there is no pooler. |
| **`AUTH_URL`** | Recommended | Public site URL, e.g. `http://localhost:3000` locally, `https://yourdomain.com` in production. NextAuth uses it for callbacks. Also try **`NEXTAUTH_URL`** if your host documents that name. |
| **`RESEND_API_KEY`** | No | If set, **`POST /api/register`** sends a short welcome email via [Resend](https://resend.com). **Free:** `RESEND_FROM=MyNextMount <onboarding@resend.dev>` — no custom domain. Paid DNS only needed if you want `From:` on your own domain. |
| **`ADMIN_ALERT_EMAIL`** | No | If set (with **`RESEND_API_KEY`**), farm-list **thumbs-down** alerts: when a mount has **≥2** downvotes and **0** upvotes, you get one email per mount (48h cooldown). See **`MountListingVote`** / **`MountListingAlertSent`** in **`prisma/schema.prisma`**. |

`npm install` runs **`prisma generate`** via `postinstall`.

### Vercel / Supabase deploy

1. Set **`DATABASE_URL`** (transaction pooler **6543**) and **`AUTH_*`** on Vercel; **`DIRECT_URL`** is optional for deploys that only run **`next build`**.
2. After any new migration, run **`npm run db:migrate`** from a machine that can reach **`DIRECT_URL`** (your PC is fine if `Test-NetConnection` to the pooler **:5432** succeeds), then push — or migrate first, then trigger deploy.
3. Local full build including migrate: **`npm run build:with-migrate`**.

## Registering an account (walkthrough)

### 1. Create the database tables (first time only)

From the project root, with `DATABASE_URL` and `DIRECT_URL` in **`.env.local`** (or `.env`):

```bash
npm run db:migrate
```

This loads `.env` / `.env.local` like Next.js; plain `npx prisma migrate deploy` only reads `.env`, so it often misses `DIRECT_URL` if you keep secrets in `.env.local`.

For local iteration you can instead use:

```bash
npx prisma migrate dev
```

If this step is skipped, **`POST /api/register`** will throw (Prisma cannot find the `User` table) and the UI shows **Registration failed**.

### 2. Start the app

```bash
npm run dev
```

### 3. Register

1. Open **`http://localhost:3000/register`** (or your deployed URL + `/register`).
2. Enter email + password (at least **8** characters).
3. On success you are redirected to **`/login?registered=1`**. Sign in, then open **`/account`** or **`/tool`**.

### 4. Other API responses (not the generic 500)

| Response | Meaning |
|----------|---------|
| **400** — Invalid email / password too short | Fix input format. |
| **409** — That email is already registered | Sign in instead or use another email. |
| **500** — Registration failed | Almost always **database** (see troubleshooting). In **`NODE_ENV=development`**, the JSON body may include the **real error message** to help you fix env/migrations. |

## Troubleshooting “Registration failed” (500)

1. **Missing `AUTH_SECRET` or `DATABASE_URL`** in the environment where the server runs (local: `.env.local`; Vercel: Project → Settings → Environment Variables). Restart dev server after editing `.env.local`.

2. **Migrations never applied** — Run **`npm run db:migrate`** (uses `DATABASE_URL` + `DIRECT_URL` from `.env.local`). Production **Vercel** builds do **not** run migrate; apply migrations before deploy when you change the schema.

3. **Wrong or missing `DATABASE_URL`** — Must be a **PostgreSQL** URL matching `provider = "postgresql"` in `schema.prisma`. Serverless hosts need a cloud Postgres, not a file on disk.

4. **Check server logs** — The route logs **`[api/register]`** plus the error. In development, the client often receives the same message in the JSON `error` field.

5. **Quick health check** — With DB migrated, you can confirm Prisma works from the shell:  
   `npx prisma studio`  
   (opens a GUI; try creating a row manually if needed.)

## User flows

1. **Register** (`/register`) → **Sign in** (`/login`) → **`/account`** (collection stats, weekly suggestions) and **`/account/settings`** (farm lockout timing, delete account).
2. **`/tool`** — paste **`M:…`** as today. If signed in, **Save to my account** / **Load saved collection** sync spell IDs with the server (`PUT` / `GET` `/api/collection`). From **My Mounts**, **View my collection on the tool** uses **`/tool?loadSaved=1`** so the saved list is applied even if the textarea still holds an older export.
3. **Delete account** — **`/account/settings`** → **Account data**; `DELETE` `/api/account` removes the user row (and session ends via sign-out).

## API surface

| Route | Purpose |
|--------|---------|
| `POST /api/register` | Create user (bcrypt password hash). |
| `[...nextauth]` | Session + credentials sign-in. |
| `GET/PUT /api/collection` | Read/write `collectionSpellIds` (authenticated). **`PUT`** body may include **`recommendationMode`**, **`sourceFilters`**, **`farmSearchQuery`** (strings/booleans as on `/tool`) so **Epic K.2** can align farm-attempt bumps with the same ranked list as the UI. |
| `GET /api/collection/snapshots` | **Epic K.1** — list immutable collection snapshots (newest first); query `limit` (default 100, max 200), `includeSpellIds=1` for full ID arrays. |
| `POST /api/collection/farm-attempts` | **Epic K.2** + **K.3** + **K.4** + **K.8** — batch lookup `{ spellIds }` (max **500**); returns **`bySpellId`** (attempts, lockout, …), **`nextWeeklyResetAt`** (ISO), and **`communityBoostBySpellId`** (string keys → additive score deltas from listing helpfulness aggregates). |
| `PATCH /api/account` | **Epic K.3** — set **`weeklyResetCalendar`**: **`americas_oceania`** \| **`europe`**. |
| `DELETE /api/account` | Wipe account (authenticated). |

## Epic K.1 — collection snapshots (historical)

- **Table:** `MountCollectionSnapshot` — `userId`, `spellIds` (comma-separated spell IDs, same encoding as `User.collectionSpellIds`), `createdAt`. Rows cascade-delete with the user.
- **`PUT /api/collection`** (non-empty `spellIds`): after updating `User`, appends a snapshot **unless** the serialized list is **byte-identical** to the latest snapshot’s `spellIds` (**duplicate skip** — no extra row; `duplicateSkipped: true` in JSON).
- **Empty save** (`spellIds: []`): clears `User.collectionSpellIds` and **does not** create a snapshot (K.1.3).
- **`PUT` response** includes `snapshot: { duplicateSkipped, diff }` where `diff` lists `added` / `removed` as `{ spellId, name }[]` vs the **previous** snapshot. **First** save: `diff` is empty (no prior baseline). **Duplicate skip:** empty `diff`.
- **Indexing:** `@@index([userId, createdAt(sort: Desc)])` keeps listing snappy for typical history sizes (&lt;200ms target at default `limit`).

## Epic K.2 — farm attempt counters (per spell ID)

- **Table:** `MountFarmAttempt` — composite id **`userId` + `spellId`**, **`attempts`**, **`lastAttemptAt`**. Rows cascade-delete with the user.
- **Increment rule:** On **`PUT /api/collection`** with a **non-empty** collection, after the usual snapshot logic, the server builds the **same ranked farm list** as `/tool` (unowned → farm eligibility → source filters → recommendation mode scoring → farm search filter), takes the **top `K_ATTEMPT_INCREMENT_CAP` (50)** spell IDs, and **`upsert`**s **`attempts += 1`** for each (see **`lib/topFarmTargetsForSave.ts`**).
- **Anti-inflation:** No increment when the new list matches the **latest snapshot** (**`duplicateSkipped`**) **or** when the user re-saves the **same** serialized collection within **`K_ATTEMPT_SPAM_WINDOW_MS` (5 minutes)**. Response field **`farmAttempts.skippedIncrement`** is true in those cases; **`spellIdsBumped`** is how many rows were updated (0 when skipped).
- **UI:** `/tool` farm rows show **Farm tries** and optional **Est. ≥1 drop seen %** (from **`lib/probabilityAtLeastOneDrop.ts`**). **Save** sends **`recommendationMode`**, **`sourceFilters`**, **`farmSearchQuery`** via **`CollectionToolbar`** so counts match what you had on screen.

## Epic K.3 — lockout completion & weekly calendar

- **`User.weeklyResetCalendar`:** **`AMERICAS_OCEANIA`** (default) or **`EUROPE`**. Boundaries (UTC): **Tuesday 15:00** vs **Wednesday 04:00** — see **`lib/mountLockoutAvailability.ts`**. **`/account/settings`** exposes radio controls (**`WeeklyResetCalendarPreference`**).
- **Table:** `MountLockoutCompletion` — **`userId`**, **`spellId`**, **`lastCompletedAt`**. Cascade-delete with user.
- **Write path:** Same **`PUT /api/collection`** gate as farm attempts (**not** on duplicate snapshot / spam window). For each of the **top 50** farm-target spell IDs whose catalog **`lockout`** is **`daily`** or **`weekly`**, **`upsert`** **`lastCompletedAt = now`**.
- **Read path:** **`POST /api/collection/farm-attempts`** merges catalog **`lockout`**, stored completion, and calendar into **`bySpellId[].lockout`**. **Daily** availability uses **24h** from **`lastCompletedAt`**. **Weekly** uses the current UTC period from the user’s calendar.

## Epic K.4 — personalized farm ranking

- **`ScoringContext.personalization`** (see **`lib/scoring/types.ts`**) feeds **`applyK4PersonalizationToScore`** after the baseline composite / rarest score (**`lib/scoring/k4Personalization.ts`**).
- **Signed-out / no farm payload:** personalization omitted — ordering matches the legacy baseline.
- **`/tool`:** Loads up to **500** spell IDs from the **baseline-sorted** head of the farm list, then re-sorts with personalization when **`nextWeeklyResetAt`** + row map arrive (see **`docs/scoring-model.md`** §10).
- **`PUT /api/collection`:** Top **50** farm targets for attempts/lockout use the **same** personalized re-rank as the tool (server builds personalization from Prisma).

## Epic K.5 — farm session plan (`/tool`)

- **`lib/farmSessionPlan.ts`** — **`buildFarmSessionPlan(ranked, budgetMinutes)`** walks the **sorted** farm list (same order as the flat list: mode + filters + farm search + signed-in K.4), adds mounts until **`timeToComplete`** minutes would exceed the budget (**30 / 45 / 60** presets). If the **first** mount alone exceeds the budget, it is still shown with a short warning.
- **`groupMountsIntoRouteGroups`** — buckets by **`expansion`** + **`location`** (catalog zone line); each bucket lists mounts and a **zone subtotal** of minutes.
- **UI:** **`components/FarmSessionPlanPanel.tsx`** — rendered above the infinite-scroll farm list when filters yield at least one mount; styling is separate from **`mount-result-card`** rows.

## Epic K.6 — local farm behavior prefs (`/tool`)

- **Storage:** Browser **`localStorage`** key **`mnm-farm-prefs-v1`** (not synced to the account). **Reset** control above the farm list clears it.
- **Capture:** Expanding the **Score** `<details>` on a farm row records engagement (throttled **once per mount per UTC day**) and updates an EMA of **`timeToComplete`** → **prefer shorter runs** strength. **Show less like this** increments a counter; when the mount matches **`mountLooksRaidHeavy`** (`lib/mountRaidHeavy.ts`: “raid” in source/tags, or hard **drop** + high difficulty), it feeds **raid avoidance**.
- **Scoring:** **`ScoringPersonalization.behavior`** → **`applyK6BehaviorPersonalizationToScore`** after K.4 (`lib/scoring/k6BehaviorPersonalization.ts`). **Hydration:** behavior is applied only after client mount so SSR and first paint match.
- **Server save path** (`PUT /api/collection` top-50): still **K.4** only — local K.6 does not sync to Postgres in v1.

## Epic K.7 — progress summary & snapshot delta UX

- **Progress:** **`computeCollectionProgressStats`** (`lib/collectionProgressStats.ts`) — **matched obtainable** / **obtainable total** / **% complete**; obtainable = catalog mounts with **`retailObtainable !== false`** (aligned with farm math). **`/account`** uses it for the saved-export list; **`/tool`** shows the same numbers in **`collection-progress-k7`** once an export is applied.
- **Gains after save:** When **`PUT /api/collection`** returns **`snapshot.diff`** from **K.1**, **`CollectionToolbar`** shows a **“New since last snapshot”** list (spell names from **`diff.added`**) in addition to the status message.

## Epic K.8 — community listing signal → recommendation boost

- **Table:** **`MountListingCommunityAggregate`** — **`spellId`** (PK), **`voteCount`**, **`sumValues`**, **`listingHelpfulnessScore`** (v1 = sum of **`MountListingVote.value`**), **`communitySignalSchemaVersion`** (default **1**), **`updatedAt`**. Rows are **not** per-user; they summarize all votes for that listing. Migration backfills from existing **`MountListingVote`** rows.
- **Write path:** **`POST /api/mounts/[spellId]/vote`** calls **`refreshMountListingCommunityAggregate`** after mutating votes.
- **Scoring:** **`lib/scoring/k8CommunityRecommendation.ts`** — **`recommendationBoostFromPersistedAggregate`** maps a row → a small additive delta (tanh-scaled, capped by **`K8_COMMUNITY_BOOST_MAX`**). **`getCommunityRecommendationBoost(spellId, bySpellId)`** reads precomputed values. **`applyK8CommunityBoostToScore`** runs **after** K.4 and K.6 inside **`scoreForRecommendationMode`**.
- **Data flow:** **`loadCommunityRecommendationBoostMap`** loads boosts for the farm-list batch; **`POST /api/collection/farm-attempts`** returns **`communityBoostBySpellId`**; **`/tool`** merges it via **`clientFarmScoringPersonalizationFromRows`**. **`buildServerFarmScoringPersonalization`** includes the same map so **`PUT /api/collection`** top-50 re-rank matches signed-in ordering (K.6 remains client-only on save).

## Troubleshooting save / load (production)

- **Save fails in the UI:** The API returns JSON errors when possible. Check host logs for **`[api/collection PUT]`** or **`[api/collection GET]`** — common causes are **Prisma / Postgres** errors (pooler, `DATABASE_URL`, or cold start). Ensure **`DATABASE_URL`** on the server allows **writes** (e.g. Supabase **transaction pooler :6543** with **`pgbouncer=true`** in the query string, per Prisma + Supabase docs).
- **Session alignment:** **`GET` / `PUT` `/api/collection`**, **`DELETE` `/api/account`**, and the **`/account` RSC** use **`auth` from `@/auth`**, the same NextAuth instance as **`[...nextauth]`**, so JWT handling matches the browser session.
- **`/account` shows “Couldn’t load your collection” (error boundary):** That digest is a generic Next.js error page — often a thrown **`prisma.user.findUnique`** (same DB issues as save). The page now catches DB errors and shows an inline **“Try again”** state with the normal hero instead of that boundary when Prisma fails on load.

## Entitlements

Signed-in users without billing use **`AUTHENTICATED_FREE_ENTITLEMENTS`** in **`types/entitlements.ts`** (same `plan: "free"` as anonymous until premium SKUs exist).

## Follow-ups (not in this MVP)

- OAuth (**J.7-e**), rate limits, email verification, password reset.
- Premium gates (**J.7-f**) and deeper personalization.
- Addon/server sync beyond manual paste (**J.7-g** / **J.6**).
