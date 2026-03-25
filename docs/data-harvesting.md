# Mount data harvesting — governance & operations

This document is the **authoritative policy** for **Phase B** (`backlog.md`). Any harvest script, manual enrichment, or third-party fetch must comply. When in doubt, **prefer less automation** over ToS risk.

---

## Maintainer override — automated content JSON (guides, digests, farm tips)

**Status:** Active by **project maintainer decision** (see **`.cursorrules`** — *Content automation*).

The maintainer may use **dedicated** npm scripts (e.g. `npm run content:…` — add under **`package.json`** as implemented) to **automatically** populate or refresh:

- **`data/mount-guides.json`**
- **`data/wowhead-comment-digests.json`**
- **`data/farm-tips.json`**

using any combination of **`data/mounts.json`** fields, HTTP fetches, APIs, and LLMs. **Human review before merge is recommended, not required** by repo policy.

**Still required for a clean architecture**

- Do **not** silently fold undocumented third-party bulk fetch into **`npm run data:build`** unless you explicitly document that coupling.
- Prefer **paraphrase** over verbatim Wowhead or other third-party prose in committed JSON.
- **Legal / ToS:** Automation may conflict with third-party terms ([Wowhead ToU](https://www.wowhead.com/terms-of-use), etc.). **The person who runs the command** accepts responsibility. This override does not grant rights from Blizzard, Wowhead, or anyone else.

**Cursor / AI agents** are **authorized** to implement and run these pipelines when the maintainer requests.

---

## Product scope (baseline)

| Decision | Current choice | Revisit when |
|----------|----------------|--------------|
| **Game** | **World of Warcraft Retail** (live) | Classic / era = separate dataset + contract appendix |
| **Canonical ID** | Mount **summon spell ID** | Never without bumping `docs/export-contract.md` **v2** |
| **Output** | `data/mounts.json` (and optional intermediates under `data/build/`) | Epic B.2 may split files |

Scope for “full catalog” means: **every spell ID** the in-game journal can treat as a learned mount for this product edition, **minus** documented exceptions (removed, GM-only, etc.).

---

## Tiered inputs (Requirement B.0.1)

Use sources **in order**. Do not skip to a lower tier for bulk data when a higher tier can provide the same field.

### Tier 1 — Blizzard Game Data API (primary)

- **Use for:** authoritative mount list, internal IDs, spell linkage, names as returned by API, faction / availability flags, patch alignment.
- **Auth:** OAuth **client credentials** (store secrets in env / `.env.local`, never commit). See [Battle.net developer portal](https://develop.battle.net/) and [legal / ToU](https://develop.battle.net/documentation/guides/legal).
- **Do not:** scrape `worldofwarcraft.com` or battle.net HTML for bulk mount lists when the API exists for that data.

### Tier 2 — Licensed or explicitly allowed structured data

- **Use for:** fields Blizzard does not expose, or pre-joined datasets you have **permission** to use (license file in repo, or written approval).
- **Document:** add a row to the **provenance manifest** (`data/build/harvest-manifest.json`) under `sources[]` with `type: "dataset"`, name, license, URL.

### Tier 3 — Wowhead, Warcraft Wiki, other wikis, community DBs

- **Use for:** **deep links** (`/spell=<id>`), **tooltip-style facts** via **documented** endpoints if allowed, **manual spot checks**, **disambiguation**, and **original summaries** you write yourself.
- **Do not:** bulk-copy **comments**, **guides**, or long **HTML page bodies** into `mounts.json` or manifests. Original guide prose belongs in **Phase C** with your own wording + citation links.
- **Before automating HTTP to any third party:** read their **Terms of Use** and **`robots.txt`**. If automation is disallowed or unclear, **stop** and use manual export or Tier 1–2 only.

### Phase B build boundary (comments & community text)

**Phase B** npm scripts (**`data:build`**, **`data:apply-scores`**, **`data:enrich-metadata`**, **`data:sync-spell-icons`**, **`data:spell-baseline`**, **`data:check-coverage`**, **`data:check-drift`**, **`data:check-surface`**, ingest helpers, etc.) must **not** bulk-fetch Wowhead comment threads, Reddit posts, or other Tier-3 prose **into those scripts’ default code paths** unless you have **explicitly** documented an exception. Keep **`data:build`** Blizzard/API-first unless you intentionally couple it (not recommended).

**Exception:** Separate **content automation** scripts (see **Maintainer override** above) **may** fetch or generate Tier-3–style prose into **`farm-tips.json`**, **`wowhead-comment-digests.json`**, and **`mount-guides.json`** when the maintainer runs them. That is **not** “Phase B” in the sense of the core mount index pipeline.

**Phase C — Epic C.4** workflows in **`docs/farm-tip-llm-workflow.md`** and **`docs/wowhead-digests.md`** remain valid **conservative** options; the maintainer may also run **fully automated** batches without a manual gate per repo policy.

---

## Rate limits, caching, and backoff (Requirement B.0.1)

These rules apply to **any** HTTP client written for this project (Blizzard included, where applicable).

| Rule | Policy |
|------|--------|
| **Cache** | Persist successful responses under `data/build/cache/` (gitignored). Key by URL + API version + query. Reuse until a **TTL** you document in the manifest `settings.cacheTtlSeconds` or per-source. |
| **Rate** | Default **≤ 1 request / second** per host unless the provider documents a higher safe burst. Blizzard: follow [documented limits](https://develop.battle.net/documentation/guides/technical-documentation). |
| **Backoff** | On `429` or `5xx`: exponential backoff (e.g. 2s, 4s, 8s, cap 60s), max retries **5**, then fail the step with a clear error (no silent partial writes). |
| **User-Agent** | Set a descriptive UA string (project name + repo URL or contact). |
| **robots.txt** | Fetch and respect for non-API hosts before building a crawler. If `Disallow` blocks your use case, **do not crawl** — use manual steps. |

---

## Provenance & reproducibility (Requirement B.0.2)

The pipeline must be **auditable**: someone can see **what** was run, **when**, and **from which sources**.

### Manifest file

- **Path:** `data/build/harvest-manifest.json` (generated; **commit** after each intentional baseline refresh so history is visible).
- **Template / schema:** see `data/build/harvest-manifest.example.json` in this repo.
- **Minimum contents:**
  - `generatedAt` — ISO-8601 UTC
  - `gameVersion` or `namespace` / `patch` string (as you define when B.2 ships)
  - `gitCommit` — optional; CI can inject `GITHUB_SHA`
  - `sources[]` — ordered list: `{ "tier": 1|2|3, "name": "...", "endpointOrNote": "...", "retrievedAt": "..." }`
  - `rowCount` / `spellIdCount` — counts emitted to `mounts.json`
  - `settings` — optional: cache TTL, rate limits used, flags

**Note:** You do **not** need `dataSource` / `lastHarvested` on **every row** in `mounts.json` if the slim schema is a goal; the **manifest** is the batch-level record. Optional future: `tags: ["stub"]` vs `["api-ingest"]` for row-level hints.

### Build log (optional)

- **Path:** `data/build/harvest.log` (gitignored) — append-only lines for each run: timestamp, command, exit code, row counts. Helps debug without bloating git.

### Secrets

- Blizzard client id/secret: **`.env.local`** (gitignored). Never commit real credentials; keep **`.env.example`** as placeholders only.

### Mount id → summon spell id map (Retail 12.x)

**Issue:** `GET /data/wow/mount/{id}` JSON **no longer includes** the summon **spell** reference (verified static-us 12.0.1+). The addon export and this repo still use **summon spell IDs** as the canonical mount key (`docs/export-contract.md`).

**Fix:** **`data/baseline/mount-to-summon-spell.json`** maps Blizzard **mount API id** → **`SourceSpellID`** from **Mount.db2** (same column the client uses for journal/learn spells).

- **Generate / refresh:** `npm run data:ingest-mount-map` — downloads [Wago Tools `Mount.csv`](https://wago.tools/db2/Mount/csv) (community DB2 mirror). The CSV contains **newlines inside quoted description fields**; the ingest script uses a full-file parser (`parseCsvRecords`), not naive line splitting. Treat as **Tier 2** game-data mirror; **commit** the JSON for offline/CI builds. Rows with `SourceSpellID=0` are skipped (rare; would need a manual supplement if the API lists such a mount).
- **Consumers:** `data:build`, `data:check-coverage` (with API), `data:check-drift --spell-diff`, `data:spell-baseline`. If the file is missing, those commands **exit with an error** telling you to run ingest.
- **Patch day:** Re-run ingest after major patches if you see “no summon spell id … map” failures (new mounts in API but not yet in ingested CSV — rare timing issue).

**npm:** Pass script flags **after** `--`, e.g. `npm run data:build -- --max=60` (without `--`, npm may consume `--max` itself).

### Environment variables — `npm run data:build` (Epic B.2)

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `BLIZZARD_CLIENT_ID` | yes | — | Battle.net OAuth client id |
| `BLIZZARD_CLIENT_SECRET` | yes | — | Battle.net OAuth secret |
| `BLIZZARD_REGION` | no | `us` | API shard: `us` \| `eu` \| `kr` \| `tw` |
| `BUILD_FETCH_DELAY_MS` | no | `1000` | Delay after each successful mount **detail** response (rate posture) |
| `BUILD_CACHE_TTL_SECONDS` | no | `86400` | Reuse on-disk cache under `data/build/cache/blizzard/mount/` before refetch |
| `BUILD_AS_OF_PATCH` | no | `retail-static-<region>` | Free-form string written to `harvest-manifest.json` as `gameVersion` |
| `GITHUB_SHA` / `GIT_COMMIT` | no | — | Optional; recorded in manifest when set (e.g. CI) |

`data:check-coverage` still honors **`COVERAGE_FETCH_DELAY_MS`** (default `1000`).

### `data:build` exit codes

| Code | Meaning |
|------|---------|
| `0` | Success — wrote `data/mounts.json` and `data/build/harvest-manifest.json` |
| `1` | Missing credentials, or one or more mount details failed after retries (no partial `mounts.json`) |
| `2` | Unexpected runtime error |

### Overrides — `data/overrides/*.json`

After the API builds a baseline row (summon spell `id`, `name`, `source`, Wowhead **links** only), **`data:build`** applies **Epic B.5** category heuristics to **`dropRate` / `difficulty` / `timeToComplete` / `lockout` / `tags`**, then **merges** optional patches **by spell id**.

- Files are read in **alphabetical order**; later files **override** the same property for the same `id`.
- Supported shapes (per file):
  - `{ "patches": [ { "id": 12345, "location": "…", "dropRate": 0.01 } ] }`
  - Top-level spell keys: `"12345": { "tags": ["rare"], "difficulty": 4 }` (ignore `schemaVersion` / `patches` / `notes` keys at the root of that object).
  - A JSON **array** of objects, each with an `id` field.

Use overrides for **manual scoring**, **tags**, **location/source** prose, and anything Tier 1 cannot supply. **`_template.json`** is an empty `patches` list you can copy from.

### Spell-ID snapshot — `npm run data:spell-baseline` (Epic B.3)

| Output | Purpose |
|--------|---------|
| **`data/build/mount-spells-raw.json`** | Generated snapshot: sorted **`uniqueSummonSpellIds`**, per-mount `{ mountId, spellId, name }`, duplicate-spell report, counts. **Commit** when you want a reviewable diff of the API universe; safe to omit from git if you rely only on the ref file. |
| **`data/baseline/spell-baseline-ref.json`** | **Committed** expected **`expectedMountIndexEntries`** (± `toleranceMountIndex`) vs live API. Optional **`expectedUniqueSpellCount`** when non-`null` locks unique spell count (± `toleranceUnique`) — use when you want CI to catch duplicate journal mounts drifting. |

Uses the same Blizzard env vars and **`data/build/cache/blizzard/mount/`** cache as **`data:build`**. Optional env: **`SPELL_BASELINE_FETCH_DELAY_MS`**, **`SPELL_BASELINE_CACHE_TTL_SECONDS`** (fallback: `BUILD_*`).

| Flag | Behavior |
|------|----------|
| *(none)* | Write `mount-spells-raw.json`, then **fail** if counts are outside ref tolerances. |
| **`--update-ref`** | Refresh `spell-baseline-ref.json` from the current API run (then commit). |
| **`--max=N`** | Dev sample only; skips ref compare and ref update. |
| **`--force-refresh`** | Ignore cache TTL for detail GETs. |

Exit codes: **`0`** OK; **`1`** missing creds, detail failures, missing ref file, or count mismatch; **`2`** unexpected error.

### Drift check — `npm run data:check-drift` (Epic B.6)

Compares the live **mount index** to **`data/mounts.json`**, and optionally walks mount **details** (with the same **`mount-to-summon-spell`** map as **`data:build`**) to list **summon spell IDs** missing from the dataset or present only locally.

| Mode | Behavior |
|------|----------|
| *(default)* | With API creds: fetch paginated mount **index** only → print **journal entry count** vs **`mounts.json` row count**, explain that the two need not be equal (rows = unique summon spells). Writes **`data/build/drift-report.json`** with **`current`** metrics and **`deltaFromPrevious`** vs the last report on disk. |
| **No creds** | Prints local row / unique-id counts only; skips API (exit **`0`**). |
| **`--spell-diff`** | Resolves every mount detail (reuses **`data/build/cache/blizzard/mount/`** TTL like **`data:build`**) → **missing** spell IDs to add after **`data:build`**, **extra** IDs in JSON but not in API set. Requires **`mount-to-summon-spell.json`**. |
| **`--strict`** | With **`--spell-diff`** and a **full** catalog walk (no incomplete **`--max`** cap): exit **`1`** if any non-excepted API spell is missing from **`mounts.json`** (same spirit as **`data:check-coverage`**). |
| **`--max=N`** | Cap detail fetches for dev; spell diff marked incomplete — do not use for strict CI. |
| **`--no-snapshot`** | Do not write **`drift-report.json`**. |
| **`--force-refresh`** | Ignore mount detail cache TTL when using **`--spell-diff`**. |

Env: **`BLIZZARD_CLIENT_ID`**, **`BLIZZARD_CLIENT_SECRET`**, **`BLIZZARD_REGION`**; delay **`DRIFT_FETCH_DELAY_MS`** (fallback **`COVERAGE_FETCH_DELAY_MS`**, default `1000`); cache TTL **`BUILD_CACHE_TTL_SECONDS`** for **`--spell-diff`**.

Exit codes: **`0`** OK; **`1`** **`--strict`** spell gaps; **`2`** bad input / missing baseline map / runtime error.

### Metadata enrich — `npm run data:enrich-metadata` (Epic B.4)

**Approved bulk path (Tier 1):** For each row’s summon **spell** `id`, call Blizzard **`/data/wow/spell/{id}`** and follow the linked **spell media** document to read the icon asset’s **`file_data_id`** → stored as **`iconFileId`**, and the asset’s **`value`** URL when present → **`iconUrl`** on the mount row (see `types/mount.ts`, **`docs/mount-icons.md`**).

- **Display name:** Journal / mount row **`name`** remains primary for the app; the spell API **`name`** is compared for **spot-checks** only (mismatches listed in **`data/build/metadata-enrich-report.json`**).
- **Acquisition type:** Use mount-detail **`source` / `sourceCategory`** from **`data:build`** (Tier 1). This step does not scrape Wowhead for categories.
- **Wowhead (Tier 3):** Rows keep **`wowheadUrl`** / **`commentsUrl`** as **deep links** only. **No** automated Wowhead HTML or bulk tooltip fetch in-repo: common tooltip URL patterns returned **404** in validation, and bulk automation must stay within [Wowhead ToU](https://www.wowhead.com/terms-of-use) + **`robots.txt`**. Revisit only if Wowhead documents a stable JSON/tooltip contract suitable for low-rate cached access.

| Env | Default | Purpose |
|-----|---------|---------|
| `ENRICH_METADATA_DELAY_MS` | `1000` | Delay after each **network** attempt for a row (success or spell **404**), so failure-heavy runs don’t burst the API; skipped when the row is served from enrich cache. |
| `ENRICH_METADATA_CACHE_TTL_SECONDS` | `604800` (7d) | Cache under `data/build/cache/blizzard/spell-enrich/`. |

| Flag | Behavior |
|------|----------|
| *(none)* | Fill **`iconFileId`** / **`iconUrl`** only where **`iconFileId`** is missing. |
| **`--ids=a,b,c`** | Only rows whose spell **`id`** is in the list (e.g. pilot icons). |
| **`--all`** | Re-fetch for every row (still respects cache TTL unless `--force-refresh`). |
| **`--max=N`** | Cap **attempts** (pilot e.g. `60` for 50+ row acceptance). |
| **`--strict`** | Exit **1** on first spell/media failure. |
| **`--force-refresh`** | Ignore enrich cache TTL. |

Outputs: updated **`data/mounts.json`**, **`data/build/metadata-enrich-report.json`**.

Rows must use **real Retail summon spell IDs** (as after **`data:build`**). Dev-only stub IDs that are not in Game Data will **404** on `/data/wow/spell/{id}`; see **`metadata-enrich-report.json`** failures (use **`--strict`** in CI only when the catalog is API-backed). Some valid mount summon spells also **404** in the public spell API; the website can still show icons via **`data/mount-icon-overrides.json`** (see **`docs/mount-icons.md`**, Epic D.2).

### Spell icon textures — `npm run data:sync-spell-icons` (Epic B.8)

**Tier 2 (structured exports, no Wowhead bulk):** Join **Wago Tools** [SpellMisc CSV](https://wago.tools/db2/SpellMisc/csv) (`SpellID` → `SpellIconFileDataID` / `ActiveIconFileDataID`) with **wowdev/wow-listfile** [`community-listfile.csv`](https://github.com/wowdev/wow-listfile/releases/latest/download/community-listfile.csv) (`FileDataID` → `interface/icons/*.blp` basename). Emit Blizzard CDN URLs:  
`https://render.worldofwarcraft.com/{region}/icons/56/{texture}.jpg` (same pattern Tier 1 spell media uses).

| Output | Purpose |
|--------|---------|
| **`data/baseline/spell-icon-textures.json`** | Catalog subset + **provenance** (`sources[]`, per-spell `fileDataId` / `textureFile` / `iconUrl`). Commit when refreshed. |
| **`data/mount-icon-overrides.json`** | Filled for **`data/mounts.json`** rows that still lack **`iconUrl`**; does **not** overwrite existing override URLs unless **`--force-overrides`**. |
| **`data/build/spell-icon-sync-report.json`** | Gaps: missing SpellMisc row, zero icon ids, missing listfile line. |

Caches (gitignored): **`data/build/cache/spell-icon-map/`** — redownload when cache older than **`SPELL_ICON_CACHE_TTL_SEC`** (default **604800**).

| Flag | Behavior |
|------|----------|
| *(none)* | Download if needed → write baseline + merge overrides. |
| **`--dry-run`** | No writes; still downloads unless cache fresh. |
| **`--map-only`** | Baseline + report only; do not change **`mount-icon-overrides.json`**. |
| **`--force-overrides`** | Replace override **`iconUrl`** when the map disagrees. |

Add a **`sources[]`** entry to **`data/build/harvest-manifest.json`** when you refresh icons for a new Retail build (patch-day note).

### Scoring heuristics — `npm run data:apply-scores` (Epic B.5)

**Tier-1 signal:** Each mount row’s **`sourceCategory`** is the lowercased Blizzard mount detail field **`source.type`** (set during **`npm run data:build`**). **Heuristics** map that category → **`dropRate`**, **`difficulty`** (1–5), **`timeToComplete`** (minutes, integer), **`lockout`** (`none` \| `weekly`), and **`tags`** (e.g. **`rare`**). **`data/overrides/*.json`** is merged **after** heuristics on the same spell **`id`**, so manual patches always win.

| `sourceCategory` | `dropRate` | `difficulty` | `timeToComplete` (min) | `lockout` | `tags` |
|------------------|------------|--------------|------------------------|-----------|--------|
| `vendor` | 1 | 1 | 20 | none | — |
| `quest` | 0.85 | 2 | 45 | none | — |
| `achievement` | 0.25 | 3 | 180 | none | — |
| `drop` | 0.02 | 4 | 120 | weekly | `rare` |
| `profession` | 0.18 | 3 | 300 | none | — |
| `promotion` | 0.9 | 1 | 15 | none | — |
| `petstore` | 0.95 | 1 | 5 | none | — |
| `tcg` | 0.35 | 2 | 30 | none | `rare` |
| `tradingpost` | 0.65 | 2 | 90 | none | — |
| `discovery` | 0.3 | 2 | 90 | none | — |
| `worldevent` | 0.35 | 2 | 60 | none | — |
| *(missing / unknown)* | 0.15 | 3 | 60 | none | — |

**Stub rows:** If **`stub`** is already in **`tags`**, it is **kept** after heuristics (default bucket applies to numeric fields).

**Commands**

- **`npm run data:build`** — builds rows from the API, runs heuristics, then applies overrides (authoritative refresh).
- **`npm run data:apply-scores`** — re-reads **`data/mounts.json`**, runs the same heuristic + override pass, writes the file back. Use when you change **`scripts/lib/scoring-heuristics.mjs`** or tweak overrides without re-fetching the API. **`--dry-run`** still writes **`data/build/scoring-heuristics-report.json`** but does not modify **`mounts.json`**.

Implementation: **`scripts/lib/scoring-heuristics.mjs`** (`SCORING_HEURISTICS_VERSION`). Report: **`data/build/scoring-heuristics-report.json`** (category histogram + override hit count).

#### Location text (not zone-level GPS)

The Blizzard mount detail endpoint does **not** expose a zone or coordinates. For rows still at **`Unknown`**, the pipeline fills a **category-level** hint from **`data/defaults/location-by-source-category.json`** (vendor / drop / shop / etc.). **`scripts/lib/location-default.mjs`** applies it during **`data:build`** and **`npm run data:apply-scores`** (after overrides). Exact NPCs, instances, and coords stay **`data/overrides/`** or future Tier-3 enrichment.

#### Optional farm blurbs (`data/farm-tips.json`)

Curated **original** one-liners per summon spell id (string keys). Merged at app load in **`lib/mounts.ts`** into **`farmTip`**; the UI prefers this over generic “why” templates.

- **Phase B:** tips are **manual** or **your own paraphrase**; see **Phase B build boundary (comments & community text)** above. No comment-harvest step in build scripts.
- **Phase C:** optional **Epic C.4** — **`npm run farm-tip:draft`** (`scripts/farm-tip-llm-draft.mjs`) for **lawful excerpts** → optional OpenAI draft → **human edit** → merge; full steps in **`docs/farm-tip-llm-workflow.md`**. Record batches in **`data/farm-tip-provenance.json`**. Still no verbatim bulk paste of third-party prose into the dataset.

Each row already links **`commentsUrl`** on Wowhead for deep reading.

---

## Goals (summary)

1. **Coverage:** Every in-scope Retail mount **summon spell ID** appears in the master dataset with **real name** and useful **location / source** (post-pipeline).
2. **Repeatability:** One command rebuilds outputs after a patch (`npm run data:build`).
3. **Trust:** Tier order above; no “convenience scraping” that violates ToS or robots.

---

## Recommended pipeline shape (reference)

| Stage | Input | Output | Notes |
|--------|--------|--------|--------|
| **1. Ingest** | Battle.net Game Data (`/data/wow/mount/index`, mount by id) | List of mounts + spell linkage | Tier 1 only for universe. |
| **2. Normalize** | Raw API JSON | `spellId` → `{ name, … }` map | Faction / unavailable flags. |
| **3. Enrich** | Spell IDs + optional Tier 3 | Links, icon ids, extra strings | Rate-limited + cached. |
| **4. Score heuristics** | Source category + `data/overrides/` | `dropRate`, `difficulty`, etc. | Document heuristics in this file when stable. |
| **5. Emit** | Merged model | `mounts.json` + **manifest** | Sort by `id`; validate schema. |

**Phase B scope:** stages 1–5 above do **not** include bulk ingestion of Wowhead/Reddit **comments** into **`mounts.json`** or the core harvest manifest. **Separate** content scripts may still write **`mount-guides.json`**, **`wowhead-comment-digests.json`**, and **`farm-tips.json`** per **Maintainer override** above.

---

## Wowhead & wikis (Tier 3 detail)

- **Wowhead:** [Terms of use](https://www.wowhead.com/terms-of-use). Prefer **links** and **small** automated reads only where permitted; cache aggressively; never mirror full pages into the dataset.
- **Warcraft Wiki / others:** same discipline — **link out**, **summarize in your words** for guides (Phase C).

### Website — comment digests (Epic D.5)

- **`data/wowhead-comment-digests.json`** is **not** produced by **`data:build`**. It merges at app load (`lib/mounts.ts`) into **`wowheadCommentDigest`** / **`wowheadCommentDigestAsOf`**.
- **Tiers:** manual, LLM from excerpts (**`npm run wowhead-digest:draft`**), or **automated batch** scripts (**maintainer** — **`docs/wowhead-digests.md`** Tier 3). **Human review** is optional per repo policy; **ToS** is the operator’s responsibility.
- **`npm run data:wowhead-digest`** writes **`data/build/wowhead-digest-report.json`** and can enforce pilot coverage with **`--strict-pilots`**.

### Full farm row coverage (all mounts)

- **`docs/guide-experience-roadmap.md`** — batched path to **guide + digest + farm tip** for the whole catalog (**Maintainer override** allows automation).
- **`npm run data:guide-experience`** — combined percentages vs **`data/mounts.json`** → **`data/build/guide-experience-coverage.json`**.

---

## Pre-commercial completeness (Epic D.6)

Before **Phase F** monetization, the product should not silently miss **surface** fields the UI relies on (icons, Wowhead links, optional digests). **`npm run data:check-surface`** is a **local, static** audit (no Blizzard API): it rebuilds the same merge chain as **`lib/mounts.ts`** and reports coverage on **non-stub** rows (rows with tag **`stub`** or name **`Mount (spell N)`** are excluded from percentage denominators).

| Metric | What counts as “filled” | Default strict threshold (env) |
|--------|-------------------------|--------------------------------|
| **Icon (web)** | Non-empty **`http(s)`** on merged **`iconUrl`** (Tier 1 enrich and/or **`data/mount-icon-overrides.json`**) or spell id listed in **`data/surface-exceptions.json`** → **`ignoreIconForSpellIds`** | **`SURFACE_MIN_ICON_PCT`** = **95** |
| **`wowheadUrl`** | Non-empty **`http(s)`** URL or **`ignoreWowheadUrlForSpellIds`** | **`SURFACE_MIN_WOWHEAD_PCT`** = **100** |
| **`commentsUrl`** | Same pattern | **`SURFACE_MIN_COMMENTS_PCT`** = **100** |
| **Comment digest** | Merged **`wowheadCommentDigest`** (from **`data/wowhead-comment-digests.json`**) | **`SURFACE_MIN_DIGEST_PCT`** = **0** (raise when you want CI to enforce pilot %) |
| **Farm tip / guide** | Optional signals | **`SURFACE_MIN_FARM_TIP_PCT`** / **`SURFACE_MIN_GUIDE_PCT`** default **0** |

**Commands**

- **`npm run data:check-surface`** — print percentages, list top **N** spell ids missing a resolvable icon (**`--top=N`**, default **25** or **`SURFACE_TOP_MISSING`**), write **`data/build/surface-check-report.json`**. Always exits **0** (informational).
- **`npm run data:check-surface -- --strict`** — same output; exits **1** if any threshold fails or if **name quality** fails (empty **`name`**, or **`Mount (spell N)`** without **`stub`** tag).

**How to improve each tier**

1. **Icons:** **`npm run data:enrich-metadata`** (Tier 1 spell media); **`npm run data:sync-spell-icons`** (Epic B.8, Tier 2 DB2 + listfile → overrides); manual rows in **`data/mount-icon-overrides.json`**; document policy in **`docs/mount-icons.md`**.
2. **Links:** From **`data:build`** / journal pipeline; exceptions only via **`data/surface-exceptions.json`** with a short justification in commit or docs.
3. **Digests:** Summaries in **`data/wowhead-comment-digests.json`** (manual and/or LLM-assisted per **`docs/wowhead-digests.md`**); report via **`npm run data:wowhead-digest`**.

See **`.env.example`** for all **`SURFACE_*`** variables.

---

## Stubs vs master (`merge-export-stubs`, Epic B.7)

- **`data/mounts.json`** — canonical Retail baseline from **`npm run data:build`** (+ overrides / enrich). **Do not** pollute it with dev export stubs.
- **`data/mounts.stubs.json`** — **staging** file for local QA: **`npm run data:merge-stubs`** writes spell IDs from your export that are **missing** from the canonical file. The Next.js app merges both at load (`lib/mounts.ts`); canonical wins on duplicate `id`.
- **Harvest / CI scripts** (`data:build`, `data:check-coverage`, `data:check-drift`, `data:check-surface`, `data:apply-scores`, `data:enrich-metadata`, `data:sync-spell-icons`) read **`mounts.json` only** — stubs never affect patch-day or coverage gates. (**`data:check-surface`** also reads **`mounts.stubs.json`** when present to mirror app merge.)


---

## Patch day (target)

1. Confirm Retail patch / API namespace.
2. Run **`npm run data:ingest-mount-map`** if Mount.db2 may have changed; commit **`data/baseline/mount-to-summon-spell.json`** when updated.
3. Run **`npm run data:spell-baseline -- --update-ref`** (Epic B.3) and commit **`data/baseline/spell-baseline-ref.json`** (+ optional **`data/build/mount-spells-raw.json`**).
4. Run `npm run data:build` (includes scoring heuristics + overrides).
5. Run **`npm run data:enrich-metadata`** (Epic B.4) to refresh **`iconFileId`** (+ review **`metadata-enrich-report.json`** for name spot-checks).
5b. Run **`npm run data:sync-spell-icons`** (Epic B.8) so **`mount-icon-overrides.json`** stays aligned with Retail DB2 exports (spell API **404** gaps); review **`spell-icon-sync-report.json`** for missing rows.
6. If you only changed **`scoring-heuristics.mjs`** or want to re-merge overrides without a full API rebuild, run **`npm run data:apply-scores`**.
7. Run **`npm run data:check-drift -- --spell-diff`** (Epic B.6) — index + spell set vs **`mounts.json`**; review **`data/build/drift-report.json`** and new spell IDs. Use **`--strict`** in CI only with a full walk (no **`--max`**).
8. Run **`npm run data:check-coverage`** (Epic B.1) with API credentials — fails if obtainable spells are missing from `mounts.json` unless listed in **`data/catalog-exceptions.json`**.
9. Run **`npm run data:check-surface`** (Epic D.6) — informational locally; use **`--strict`** before commercial launch once icon/link thresholds are green (see **Pre-commercial completeness** above).
10. Commit `mounts.json` + **updated `data/build/harvest-manifest.json`** + optional **`data/build/drift-report.json`** + short note in commit message (count delta).

### Catalog exceptions & full coverage (Epic B.1)

- Human policy: **`docs/mount-catalog-exceptions.md`**
- Machine list: **`data/catalog-exceptions.json`** (`excludedSpellIds`)

---

## Open decisions

- Classic / Mists split datasets vs one app.
- Single `mounts.json` vs split by expansion.
- Exact Wowhead access (tooltip XML vs manual vs hybrid) — **document the chosen method in the manifest** when code ships.

---

## Phase C — Guides (Epic C.1+)

- **Farm guides** (overview + checklist + `sourceUrl`) live in **`data/mount-guides.json`** and merge in **`lib/mounts.ts`**. Policy: original summaries, link out — see **`docs/guides.md`**.
- **Editor workflow** (how to add guides, PR notes, optional `data:build` stub): **`docs/guides.md`** — *Harvesting workflow (Epic C.3)*. Repo entry: **`CONTRIBUTING.md`**.

---

*Epic B.0: this file is the governance baseline; amend via PR / review when policy changes.*
