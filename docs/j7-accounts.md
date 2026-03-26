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
| **`RESEND_API_KEY`** | No | If set, **`POST /api/register`** sends a short welcome email via [Resend](https://resend.com). Use **`RESEND_FROM`** (e.g. `MyNextMount <onboarding@resend.dev>`) until you verify a domain. |

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

1. **Register** (`/register`) → **Sign in** (`/login`) → **`/account`** (collection stats, weekly suggestions, expansion table, delete account).
2. **`/tool`** — paste **`M:…`** as today. If signed in, **Save to my account** / **Load saved collection** sync spell IDs with the server (`PUT` / `GET` `/api/collection`).
3. **Delete account** — `DELETE` `/api/account` removes the user row (and session ends via sign-out).

## API surface

| Route | Purpose |
|--------|---------|
| `POST /api/register` | Create user (bcrypt password hash). |
| `[...nextauth]` | Session + credentials sign-in. |
| `GET/PUT /api/collection` | Read/write `collectionSpellIds` (authenticated). |
| `DELETE /api/account` | Wipe account (authenticated). |

## Entitlements

Signed-in users without billing use **`AUTHENTICATED_FREE_ENTITLEMENTS`** in **`types/entitlements.ts`** (same `plan: "free"` as anonymous until premium SKUs exist).

## Follow-ups (not in this MVP)

- OAuth (**J.7-e**), rate limits, email verification, password reset.
- Premium gates (**J.7-f**) and deeper personalization.
- Addon/server sync beyond manual paste (**J.7-g** / **J.6**).
