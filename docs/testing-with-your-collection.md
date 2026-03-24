# Testing the site against your real mount collection

Your `/mountexport` string can list **hundreds** of spell IDs. The bundled **`data/mounts.json`** is the **canonical** API baseline (Epic B.2). To validate that owned mounts are **carved out** of recommendations (and to populate **“Your rarest mounts”**) for IDs **not** yet in that file, add **dev stubs** in a separate staging file (Epic B.7).

## Steps

1. In WoW, run **`/mountexport`** and copy the full `M:…` line.
2. Paste it into **`fixtures/my-collection-export.txt`** (the script uses the **first** line that starts with `M:`; comments above it are OK).
3. From the project root run:

   ```bash
   npm run data:merge-stubs
   ```

4. Restart **`npm run dev`** (or rebuild) so Next.js picks up the updated **`data/mounts.stubs.json`**.
5. Paste the **same** export into the website and click **Find My Mounts**.

## What the script does (Epic B.7)

- **Does not modify** `data/mounts.json` (production / patch-day baseline stays clean).
- Writes **`data/mounts.stubs.json`** with one row per export spell ID that is **not** already in `mounts.json`:
  - `name`: `Mount (spell <id>)`
  - Scoring fields from default heuristics + stub location line
  - `tags`: `["stub"]`
  - `wowheadUrl` / `commentsUrl` for quick checks
- **Replaces** the whole stubs file each run from the current export (IDs already in canonical are omitted).
- The app **`lib/mounts.ts`** merges **`mounts.json` + `mounts.stubs.json`** at load; canonical rows **win** if the same `id` appears in both.

## Production / data scripts

**`npm run data:build`**, **`data:check-coverage`**, **`data:check-drift`**, etc. use **`mounts.json` only** — stubs do not affect CI or API diffs. Refresh the real catalog with **`data:build`** after patches; re-run **`data:merge-stubs`** if you still need local-only IDs for QA.

## Legacy stubs inside `mounts.json`

If an older workflow left `Mount (spell N)` rows **inside** `mounts.json`, remove them with a fresh **`npm run data:build`** (or edit them out). New work should keep stubs in **`mounts.stubs.json`** only.

## Git

- **`fixtures/my-collection-export.txt`** may fingerprint your collection — **commit or ignore** as you prefer.
- **`data/mounts.stubs.json`** is the same: often **gitignored** locally if it lists rare spell IDs; the repo ships **`[]`** as default. If you ignore it, keep an empty `[]` file or restore from template so imports do not break.
