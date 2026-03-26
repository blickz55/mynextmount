# Epic J.7 — Authenticated accounts & saved collection (MVP)

This note describes what shipped for **identity + persistent collection + account dashboard + weekly plan slice**. The **anonymous paste flow on `/tool` stays primary**; auth is opt-in for save/load and `/account`.

## Production gate

Shipping **auth to production** still follows **`docs/business-strategy.md`** §2 (**F.1**): stability, data surface checks, and operator intent before real user passwords and PII. Local and staging can exercise the stack earlier.

## Stack

- **NextAuth v5** (beta) — Credentials (email + password), JWT sessions, `trustHost: true`.
- **Prisma 6** + **SQLite** in dev (`prisma/schema.prisma`, migrations under `prisma/migrations/`). Use a hosted Postgres (or other supported DB) in production via `DATABASE_URL`.

## Environment

Copy **`.env.example`** into `.env.local`. Minimum for local dev:

- `AUTH_SECRET` — strong random secret (e.g. `openssl rand -base64 32`).
- `DATABASE_URL` — e.g. `file:./dev.db` (path is relative to the `prisma/` directory; creates `prisma/dev.db`).
- `AUTH_URL` / site URL — e.g. `http://localhost:3000` so NextAuth builds correct links.

`npm install` runs **`prisma generate`** via `postinstall`.

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
