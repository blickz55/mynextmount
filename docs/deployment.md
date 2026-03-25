# Deploying MyNextMount (www.mynextmount.com)

The app is a **static Next.js** site (`next build` → prerendered pages). No database or server runtime is required for the current MVP.

## Recommended: Vercel + Git (simplest)

1. Push this repository to **GitHub** (or GitLab / Bitbucket supported by Vercel).
2. In [Vercel](https://vercel.com): **Add New… → Project** → import the repo.
3. **Build settings** (defaults are fine):
   - Framework: Next.js  
   - Build: `npm run build`  
   - Output: Next default  
4. **Environment variables** (Project → Settings → Environment Variables), for **Production** (and Preview if you want):
   - `NEXT_PUBLIC_SITE_URL` = `https://www.mynextmount.com`  
   - **`NEXT_PUBLIC_ADDON_LISTING_URL`** (optional) — canonical **MyNextMount** page on CurseForge, Wago, etc. When the addon is published, set this so **How to** and **`/`** point at the real project instead of the default CurseForge search. See **`docs/addon-install.md`** § *Public listing*.
   - Add any keys you use locally from **`.env.example`** (e.g. Blizzard API) only if a future server/edge feature needs them; the current home page does not call Blizzard at runtime.
5. **Pre-prod on `www`:**  
   - Git → **Production Branch** = `staging` (or your pre-prod branch name).  
   - Then pushes to that branch update the **production** deployment on Vercel.
6. **Domains** → add **`www.mynextmount.com`**, follow the DNS instructions (usually **CNAME** `www` → `cname.vercel-dns.com` or the value Vercel shows).
7. Optional: add **apex** `mynextmount.com` with a **redirect** to `https://www.mynextmount.com` in Vercel Domains.

After DNS propagates, **`https://www.mynextmount.com`** serves the staging/pre-prod build. When you are ready for “real” production, point **Production Branch** at `main` and attach **www** (or swap **www** ↔ **preview** domains as you prefer).

## Optional: GitHub Action deploy

If you prefer CI to invoke Vercel instead of only the Vercel Git app:

1. Install Vercel CLI locally: `npm i -g vercel`, run `vercel link` in the repo root, and note **org** and **project** IDs in `.vercel/project.json`.
2. Create a token: Vercel → Account → **Tokens**.
3. In GitHub → repo → **Settings → Secrets and variables → Actions**, add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
4. **Actions** → **Deploy staging (Vercel)** → **Run workflow** (uses the branch you select, e.g. **`staging`**). It does **not** run on push, so Vercel’s Git integration can be your only automatic deploy without extra notification noise.

You can delete **`.github/workflows/vercel-staging.yml`** if you will never use CLI deploy from GitHub.

## Local parity

- **`NEXT_PUBLIC_SITE_URL`** — canonical site URL for `metadataBase` / Open Graph (defaults to `https://www.mynextmount.com` in code if unset).
- **`NEXT_PUBLIC_ADDON_LISTING_URL`** — optional; **`lib/addonListing.ts`** falls back to CurseForge search for `MyNextMount` when unset (Epic **I.1**).
- **`npm run test`** — Vitest regression suite (parse, ownership filter, scoring, sort order); same command CI runs before lint/build.
- **`docs/mobile-smoke-checklist.md`** — quick pass for **`/`** and **`/tool`** on a narrow viewport (Epic **H.1**).

## CI without deploy

**`.github/workflows/ci.yml`** runs **`npm run test`**, **`npm run lint`**, and **`npm run build`** on pushes and PRs to `main` / `staging` / `master`. **`eslint.config.mjs`** must exist so `next lint` does not try to open an interactive wizard (that fails on GitHub with exit code 1).

**`.github/workflows/vercel-staging.yml`** is **manual-only** (`workflow_dispatch`). It does not run on push, so it won’t email you when Vercel already deploys from Git.
