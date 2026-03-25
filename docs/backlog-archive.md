# MyNextMount — Backlog archive (completed work)

This file preserves **completed** epics and baseline notes for history. For **what to build next**, use the active **[backlog.md](backlog.md)** in the repo root.

---

## Completed baseline (MVP) — reference only

The repo already includes a **local Next.js** flow: paste `M:…` export string → validate → filter owned → score (Easiest / Rarest) → top 10 → basic “why” copy, plus a **“rarest you own”** showcase. Dataset uses **mount summon spell IDs** (see `docs/export-contract.md`). **`npm run data:merge-stubs`** writes **`data/mounts.stubs.json`** for export IDs missing from canonical **`mounts.json`** (Epic B.7 — dev staging; app merges at load). **Phase B** + **`docs/data-harvesting.md`** define building a **full harvested baseline** (Blizzard API + controlled Wowhead/wiki enrichment) and replacing stub-first workflows.

**Do not remove** this flow while extending; evolve it.

---

# PHASE A — Export contract & addon (foundation)

## Epic A.1 — Canonical mount ID ✅ Complete

### Requirement A.1.1

- **Use the same ID Blizzard uses for “learned mount” / collection** (typically **mount spell ID** as exposed by APIs and community tools — confirm against `C_MountJournal` / API docs for your target game version).
- **Every** row in `mounts.json` must use that ID so addon export and website filter stay aligned.

**Acceptance**

- Written **ID contract** in repo (short `docs/export-contract.md` or section in README): what `M:` numbers mean, version, endianness, comma rules.
- Sample strings from a **real character** parse and filter correctly against full dataset (once dataset exists).

---

## Epic A.2 — WoW addon: export to clipboard ✅ Complete

### Requirement A.2.1

- In-game slash command or button: **copy export string** to clipboard in format:

  `M:<id>,<id>,<id>`

- **No spaces** (match website parser) unless we version the format and update both sides.
- Handle **large collections** (thousands of IDs): string length within WoW clipboard limits; if needed, **chunked format** (v2) with website support.

**Acceptance**

- On a character with known mounts, exported string round-trips: paste on site → **no owned mount** appears in recommendations.
- Addon shows **count** of mounts exported and **last export time** (optional).

### Requirement A.2.2

- **Error handling**: not logged in, journal not ready, etc. — user-visible message, no silent empty string.

---

## Epic A.2b — Export window: scroll + dismiss ✅ Complete

### Requirement A.2b.1

- **Fixed-size** dialog with **scrollable** text (no full-screen vertical growth for large collections).
- **Esc** closes the window; **Close** button; frame registered so default **Escape** behavior works reliably (not stolen only by the edit box without dismiss).
- Optional: **draggable** header bar for repositioning.

**Acceptance**

- With 300+ mount IDs, the window stays a reasonable size on screen; scrollbar appears in the text area.

---

## Epic A.4 — Local testing: merge your export into stub staging ✅ Complete

### Requirement A.4.1

- Developer workflow: paste `/mountexport` line into `fixtures/my-collection-export.txt`, run **`npm run data:merge-stubs`**, which writes **`data/mounts.stubs.json`** with **stub** mount rows (heuristic stats, `stub` tag) for any spell ID not already in canonical **`data/mounts.json`** (Epic B.7 — does not mutate the baseline).
- Lets you validate **filtering** and **“rarest owned”** against a large overlap without hand-authoring hundreds of rows.

**Acceptance**

- Script documented in `docs/testing-with-your-collection.md`; exits with a clear error if the fixture file has no `M:` line.

---

## Epic A.3 — Addon UX shell (pre-guide) ✅ Complete

### Requirement A.3.1

- Minimal **options frame**: “Copy export for website”, link/open instructions (could be URL to your site’s help page).
- **No dependency** on forbidden combat hooks for core export (12.0-safe posture).

**Acceptance**

- Addon loads on Retail target build without Lua errors on `/reload`.

**Implemented**

- **Esc → Options → AddOns → MyNextMount** (`Settings.RegisterCanvasLayoutCategory`): title, version, **Open export for website** (runs same flow as `/mountexport`), wrapped **how-to** text pointing at `docs/export-contract.md` on disk.
- Optional **`MountFarmExportDB.websiteUrl`** + **Show website URL** → small popup to **Ctrl+C** (local dev URL, etc.). No combat hooks; journal read only in existing export path.

---

# PHASE B — Complete mount catalog & harvesting

**Problem (pre–B.2):** Stub-heavy or hand-curated **`mounts.json`** made **“rarest you own”** and recommendations noisy. **B.2 + B.7:** canonical **`data/mounts.json`** is API-backed; dev stubs live in **`data/mounts.stubs.json`** and merge only in the app.

**Strategy doc (living):** `docs/data-harvesting.md` — sources, order of operations, legal/rate-limit posture, and how Wowhead/wikis fit in **without** treating them as a dump truck for copied prose.

---

## Epic B.0 — Harvesting governance ✅ Complete

### Requirement B.0.1

- **Tiered inputs** (highest trust first):
  1. **Blizzard Game Data API** (mount index, spell linkage, availability flags) — OAuth client; no scraping Blizzard pages for bulk IDs.
  2. **Structured enrichment** (name, icon file id, default “source” text) from allowed endpoints or **licensed** datasets — document each choice in `docs/data-harvesting.md`.
  3. **Wowhead / Warcraft Wiki / other wikis** — use for **human-facing links**, **spot checks**, and **curated** field fills; avoid mass copy-paste of guide/comments text into JSON (Phase C owns original guide copy).
- **Robots.txt, rate limits, ToS** respected; cache responses; backoff on errors.

### Requirement B.0.2

- **Provenance**: each generated row (or batch) records `dataSource` / `lastHarvested` in a **sidecar manifest** or build log (not necessarily every field in `mounts.json` if we keep JSON slim — but the **pipeline** must be reproducible).

**Acceptance**

- `docs/data-harvesting.md` committed and reviewed when pipeline first ships.

**Implemented**

- **`docs/data-harvesting.md`** — full governance: **Retail scope**, **Tier 1–3** rules, **rate limit / cache / backoff / UA / robots** table, **manifest vs slim `mounts.json`**, secrets & patch-day notes.
- **`data/build/README.md`** — artifact layout; **`data/build/harvest-manifest.example.json`** — provenance template (`schemaVersion`, `sources[]`, counts, `settings`).
- **`.gitignore`** — `data/build/cache/`, `data/build/harvest.log`.
- **`docs/export-contract.md`** — pointer to harvesting doc for **dataset scope** (Retail vs future editions).

---

## Epic B.1 — Full `mounts.json` coverage ✅ Complete (policy + tooling; row fill = B.2)

### Requirement B.1.1

- **100% of obtainable mounts** in scope for your edition (Retail vs Classic — **define scope** in `docs/export-contract.md` or harvesting doc) appear in the **master dataset** with **real name** and **non-stub** `location` / `source` (placeholders only until first harvest pass lands).
- **Exceptions** explicitly listed (e.g. removed-from-game, GM-only) with rationale — **“no exceptions”** means zero *unlisted* gaps among obtainable mounts in scope.

**Acceptance**

- Automated **count check**: dataset count vs API/journal count for scope.
- **Diff report** when Blizzard patches add mounts (CI or manual script).

### Requirement B.1.2

- Preserve strict core schema; **extend** with optional fields (below) without breaking the app.

**Suggested extensions** (finalize in schema story):

| Field | Purpose |
|--------|---------|
| `wowheadMountId` or `spellId` | Stable link key |
| `wowheadUrl` | Direct mount page URL |
| `commentsUrl` | Mount page **#comments** (or Wowhead’s comments tab deep link pattern) |
| `iconAssetId` or `iconFileId` | For WoW-style icons / CDN path |
| `guide` | Structured checklist + prose (see Phase C) |
| `sourceCategory` | Drop / vendor / achievement / PvP / promo / etc. |
| `retailObtainable` | bool + `asOfPatch` |

**Implemented (B.1)**

- **`docs/mount-catalog-exceptions.md`** — exception policy + table (starts empty; sync with JSON).
- **`data/catalog-exceptions.json`** — `excludedSpellIds` for intentional omissions (machine-readable).
- **`npm run data:check-coverage`** — `scripts/check-mount-coverage.mjs`: local stats (rows, stubs, duplicate ids); with **`BLIZZARD_CLIENT_ID` / `BLIZZARD_CLIENT_SECRET`** fetches Retail mount index + each mount detail, builds API **spell ID** set, prints **missing / extra** vs `mounts.json` (diff report). Respects **~1s delay** between detail requests (override `COVERAGE_FETCH_DELAY_MS`). Exits **1** if any API spell is missing from dataset and not excluded (full fetch only). **`--max=N`** for quick dev sampling.
- **`.env.example`** — documents API vars for the check.
- **`types/mount.ts`** — optional **`wowheadUrl`**, **`commentsUrl`**, **`iconFileId`**, **`sourceCategory`**, **`retailObtainable`**, **`asOfPatch`** (`guide` deferred to Phase C schema).
- **`docs/data-harvesting.md`** — links exceptions + `data:check-coverage` in patch-day flow.

**Not done here (by design):** Deep **Tier 3** enrichment beyond API + overrides — see **B.4**. **`npm run data:build`** (Epic B.2) replaces stub baselines with API-backed rows; **B.5** heuristics + **`data/overrides/`** set scoring fields (see **`docs/data-harvesting.md`**).

---

## Epic B.2 — Authoritative build pipeline ✅ Complete

### Requirement B.2.1

- One **`npm run data:build`** that:
  1. **Ingests** the full spell-ID universe for Retail mounts (from API).
  2. **Merges** API fields + optional **Wowhead URLs** (link-only Tier 3) into canonical rows (id = summon spell id per `docs/export-contract.md`).
  3. **Applies** `data/overrides/*.json` for fields automation cannot guess (rare tags, difficulty, drop heuristics).
  4. **Emits** `data/mounts.json` (and optional split files if size hurts DX).
- **Idempotent**: re-run after patch without hand-diffing thousands of lines (on-disk cache + manifest).

**Acceptance**

- **`docs/data-harvesting.md`** — env vars, exit codes, output paths, **overrides** format.
- **`scripts/build-mounts.mjs`** — OAuth, paginated index, per-mount detail with **retry/backoff**, **User-Agent**, **`data/build/cache/blizzard/mount/`** TTL cache, **`data/build/harvest-manifest.json`**.

---

## Epic B.3 — Spell-ID baseline (complete universe) ✅ Complete

### Requirement B.3.1

- Generate a **complete list** of Retail mount **summon spell IDs** that the addon export can emit, aligned with `C_MountJournal` / API.
- Store intermediate artifact (e.g. `data/build/mount-spells-raw.json`) in repo **or** gitignored build dir — document which.

**Acceptance**

- Script compares count to a known-good reference (API total or manual snapshot) and **fails loudly** on large mismatch.

**Implemented**

- **`npm run data:spell-baseline`** → `scripts/spell-baseline.mjs` + `scripts/lib/collect-mount-spell-baseline.mjs` (shared mount detail cache with B.2).
- **`data/build/mount-spells-raw.json`** — full snapshot (`uniqueSummonSpellIds`, `entries[]`, duplicate report). Optional commit; documented in **`docs/data-harvesting.md`**.
- **`data/baseline/spell-baseline-ref.json`** — committed **expectedMountIndexEntries** ± tolerance; optional **expectedUniqueSpellCount** when not `null`. **`--update-ref`** refreshes from a live API run.

---

## Epic B.4 — Metadata harvest (Wowhead + wikis) ✅ Complete (Tier 1 bulk; Tier 3 links only)

### Requirement B.4.1

- For each spell ID, resolve **display name**, **icon id** (if used), and **high-level acquisition type** using an approved method:
  - Prefer **Blizzard API** fields when present.
  - Wowhead: **per-spell or per-mount page** mapping (`/spell=<id>`), **tooltips XML** or other **documented** endpoints if ToS allows; **no** aggressive HTML scraping without explicit approval in `docs/data-harvesting.md`.
- Warcraft Wiki / other wikis: **secondary** for disambiguation and link targets, not primary bulk DB unless licensed.

**Acceptance**

- Pilot harvest of **50+** mounts matches manual spot-check on Wowhead + in-game journal names.
- **Rate limiting** and **caching** implemented (e.g. on-disk cache dir, configurable QPS).

**Implemented**

- **`npm run data:enrich-metadata`** → `scripts/enrich-mount-metadata.mjs` + **`fetchSpellEnrichment`** in `scripts/lib/blizzard-mount.mjs` (spell JSON + spell media → **`iconFileId`**; name cross-check in **`data/build/metadata-enrich-report.json`**).
- **Acquisition type** remains from **`data:build`** mount detail (`source` / `sourceCategory`). **Wowhead:** **`wowheadUrl` / `commentsUrl`** on rows only; bulk Wowhead automation **not** shipped (policy + 404 on probed tooltip URLs — see **`docs/data-harvesting.md`**).
- **Pilot:** use **`--max=60`** (or full catalog). Default **≤1s** between spell+media pairs; **7d** disk cache under **`data/build/cache/blizzard/spell-enrich/`**.

---

## Epic B.5 — Scoring field derivation ✅ Complete

### Requirement B.5.1

- Map harvested **source category** + optional manual overrides → `dropRate`, `difficulty`, `timeToComplete`, `lockout`, `tags` (including `rare` where appropriate).
- Document **heuristics** (e.g. “world boss → weekly + rare tag”) in `docs/data-harvesting.md` so future you can tune without reverse-engineering code.

**Acceptance**

- Easiest/Rarest top-5 smoke test on a known export string feels plausible after harvest (manual QA story).

**Implemented**

- **`scripts/lib/scoring-heuristics.mjs`** — `applyScoringHeuristics(row)` from **`sourceCategory`**; version constant for reports.
- **`scripts/lib/overrides.mjs`** — shared **`loadOverridesMap`** / **`applyRowOverride`** (used by **`data:build`** and **`data:apply-scores`**).
- **`npm run data:build`** — applies heuristics in **`defaultMountFromApi`**, then row overrides.
- **`npm run data:apply-scores`** → **`scripts/apply-scoring-heuristics.mjs`** — refresh **`data/mounts.json`** without API; **`--dry-run`**; report **`data/build/scoring-heuristics-report.json`**.
- **`scripts/merge-export-stubs.mjs`** — writes **`data/mounts.stubs.json`** (B.7); heuristic defaults + **`stub`** tag.
- **Docs:** **`docs/data-harvesting.md`** (Epic B.5 table + pipeline).

---

## Epic B.6 — Drift detection & patch updates ✅ Complete

### Requirement B.6.1

- **`npm run data:check-drift`** (or part of `data:build`) compares:
  - API mount count vs built JSON row count.
  - Optional: diff spell-ID sets → print **new** IDs to add (for post-patch workflow).

**Acceptance**

- One command documented for “patch day” refresh.

**Implemented**

- **`npm run data:check-drift`** → **`scripts/check-mount-drift.mjs`**: mount **index** count vs **`mounts.json`** rows; **`--spell-diff`** walks details (cached like **`data:build`**) → missing / extra summon spell IDs; **`--strict`** for CI; **`data/build/drift-report.json`** with **`deltaFromPrevious`**.
- **`scripts/lib/collect-api-mount-spell-ids.mjs`** — shared detail walk; **`data:check-coverage`** refactored to use it (no cache; drift spell-diff uses cache).
- **Docs:** **`docs/data-harvesting.md`** (Epic B.6 + patch day step 7).

---

## Epic B.7 — Stub lifecycle ✅ Complete

### Requirement B.7.1

- **`merge-export-stubs`** remains valid for **dev**, but **production baseline** comes from **B.2** output. Future: merge-stubs **upserts** into a **staging** file or flags rows for harvest instead of permanent `Mount (spell N)` in the canonical JSON.

**Acceptance**

- Backlog / `docs/testing-with-your-collection.md` updated when pipeline replaces stub-first workflow for “full” installs.

**Implemented**

- **`data/mounts.stubs.json`** — committed default **`[]`**; dev-only staging for export-derived stubs.
- **`scripts/merge-export-stubs.mjs`** — reads canonical **`mounts.json`** for ID set only; **rewrites** **`mounts.stubs.json`** (export IDs minus canonical); never writes **`mounts.json`**.
- **`lib/mounts.ts`** — merges canonical + stubs at load; canonical wins on **`id`** collision; dedupes stub file by **`id`**.
- **Docs:** **`docs/testing-with-your-collection.md`**, **`docs/data-harvesting.md`** (Stubs vs master); backlog **A.4** wording aligned.

---

## Epic B.8 — Spell icon textures (DB2 + listfile) ✅ Complete

**Goal:** Near-complete **web spell icons** for the catalog without bulk Wowhead fetches: join **SpellMisc** + **FileDataID → icon path** listfile, emit Blizzard **`render.worldofwarcraft.com`** URLs into **`mount-icon-overrides.json`**.

### Requirement B.8.1

- **Tier 2 sources:** Wago Tools **SpellMisc** CSV; wowdev **community-listfile.csv**.
- **Outputs:** committed **`data/baseline/spell-icon-textures.json`** (provenance + per-spell URLs); merged **`data/mount-icon-overrides.json`**; **`data/build/spell-icon-sync-report.json`** for gaps (test/PH spells, missing DB2 rows).

### Requirement B.8.2

- **Caching:** Large CSVs under **`data/build/cache/spell-icon-map/`** (gitignored); configurable TTL.

**Implemented**

- **`scripts/sync-spell-icons.mjs`**, **`package.json`** **`data:sync-spell-icons`**.
- **`docs/data-harvesting.md`** (Epic B.8 section), **`docs/mount-icons.md`** (refresh order).

---

# PHASE C — Guides & checklists (website + addon)

## Epic C.1 — Written guide model ✅ Complete

### Requirement C.1.1

- Per mount: **short overview** + **ordered checklist** (steps player can mentally or physically check off).
- **Not** full 3D navigation / arrows — **text-first**.

### Requirement C.1.2

- **Provenance**: each guide links or cites **primary source** (Wowhead page section, official article, etc.). Avoid copying long proprietary text; **summarize** and link out.

**Acceptance**

- At least **N** pilot mounts (pick diverse sources: raid drop, world drop, vendor, achievement) have full guides + checklist in data model and render on web + in addon.

**Implemented**

- **`types/mountGuide.ts`**, optional **`Mount.guide`** on **`types/mount.ts`**.
- **`data/mount-guides.json`** — **6** pilots: **40192** Ashes (raid drop), **72286** Invincible (raid), **60002** TLPD (world), **6648** Chestnut Mare (vendor), **71810** Wrathful Gladiator wyrm (achievement/legacy), **5784** Felsteed (quest/class).
- **`lib/mounts.ts`** — merges guides after farm tips.
- **`components/MountGuideBlock.tsx`** — overview, ordered checklist with checkboxes, **Source** link; used in **`app/page.tsx`** on farm recommendations.
- **`docs/guides.md`** — schema, quality bar, how to add entries.
- **Addon:** **`MountFarmGuides.lua`** + UI shipped in **Epic C.2** (see below).

---

## Epic C.2 — Addon: display guide + checklist ✅ Complete

### Requirement C.2.1

- For a selected mount: show **same checklist** as website (or subset); persist **checked state locally** (SavedVariables) per character or account — **your choice**, document it.

**Acceptance**

- Relog does not lose progress (if promised).
- No mandatory network calls from addon for core checklist (offline-capable data baked in or shipped with addon).

**Implemented**

- **`npm run addon:sync-guides`** → **`scripts/generate-addon-guides.mjs`** → **`addons/MountFarmExport/MountFarmGuides.lua`** (from **`data/mount-guides.json`** + names from **`mounts.json`**).
- **`addons/MountFarmExport/MountFarmGuideUI.lua`** — **`/mfguides`**, Prev/Next through pilots, overview + **UICheckButtonTemplate** checklist, **Copy source URL** dialog; **`MountFarmGuideUI_OnOptionsCanvasReady`** hooked from **`MountFarmExport.lua`** settings canvas.
- **`MountFarmExportDB.guideChecks[spellId][stepIndex]`** — **per account** SavedVariables (documented in **`docs/addon-install.md`**).
- **`.toc`** loads **`MountFarmGuides.lua`** → **`MountFarmGuideUI.lua`** → **`MountFarmExport.lua`**; version **1.1.0**.

---

## Epic C.3 — Guide harvesting workflow ✅ Complete

### Requirement C.3.1

- Document **human-in-the-loop** process: editor pulls facts from Wowhead/official pages, writes original checklist, attaches `sourceUrl`.
- Optional: semi-automated **stub** generation (name, source type) from API — **human review** before ship.

**Acceptance**

- `CONTRIBUTING.md` or `docs/guides.md` describes the workflow and quality bar.

**Implemented**

- **`docs/guides.md`** — **Harvesting workflow (Epic C.3)**: research → draft → cite; step-by-step for new guides; optional API row via **`data:build`** then human-written guide; “what not to do” (C.4 / Phase B); PR expectations.
- **`CONTRIBUTING.md`** — entry point linking **`docs/guides.md`**, **`addon:sync-guides`**, **`data-harvesting.md`**, **`.cursorrules`**, short PR note.

---

## Epic C.4 — Farm tip expansion (comment-informed LLM summarization) ✅ Complete

### Requirement C.4.1

- **Not in Phase B builds:** **`data:build`** and other **Phase B** harvest commands (see **`docs/data-harvesting.md` — Phase B build boundary**) must **not** bulk-fetch Wowhead comments, Reddit threads, or similar Tier-3 prose into committed JSON. That rule stays even if LLM tooling is available.

### Requirement C.4.2

- **Phase C pipeline:** Optional workflow where inputs are **lawfully obtained** (e.g. editor-copied excerpts, exports allowed by site ToU, or future documented APIs). An **LLM** produces **original** short tips (one or two sentences); outputs are **edited** so the repo never stores long verbatim copies of third-party comments.

### Requirement C.4.3

- **Human review** is mandatory before merge to **`data/farm-tips.json`** (or a split file merged at build/load). Record **provenance** per batch: mount ids touched, date, reviewer, and source class (e.g. “manual Wowhead excerpt + LLM draft”).

### Requirement C.4.4

- **Automation posture:** Re-validate **Wowhead**, **Reddit**, and any other host’s **ToU** / **robots.txt** before scripting fetches. If unclear, keep the default: **manual excerpt → LLM → human edit → PR**.

**Acceptance**

- **`docs/data-harvesting.md`** explicitly ties this epic to the Phase B boundary (already cross-linked from that doc).
- Pilot: at least **N** mounts (diverse sources: raid drop, shop, world boss) ship with LLM-assisted, human-approved tips; no verbatim comment dumps in git history for those rows.

**Implemented**

- **`scripts/farm-tip-llm-draft.mjs`** — excerpt file + optional **`FARM_TIP_OPENAI_API_KEY`**; template-only mode writes **`data/build/farm-tip-llm-last-prompt.txt`** (gitignored); OpenAI mode writes draft to **`data/build/farm-tip-llm-draft-output.json`** (gitignored).
- **`npm run farm-tip:draft`** — forwards **`--file=`** / **`--spell-id=`**.
- **`docs/farm-tip-llm-workflow.md`** — governance, env, provenance, merge checklist.
- **`fixtures/farm-tip-excerpt.example.txt`** — safe example input.
- **`data/farm-tip-provenance.json`** — batch log (**`c4-pilot-2025-03`**: **63796** Mimiron's Head, **127170** Astral Cloud Serpent, **171828** Solar Spirehawk — human-finalized tips + script path for future LLM runs).
- **`data/farm-tips.json`** — three new pilot one-liners (raid / raid / world-boss style).
- **`.env.example`**, **`.gitignore`** (LLM build artifacts), **`CONTRIBUTING.md`**, **`docs/data-harvesting.md`** cross-links.

---

# PHASE D — Website: Wowhead + visuals

## Epic D.1 — Wowhead links (comments tab) ✅ Complete

### Requirement D.1.1

- Each result row includes a **clear link**: **Wowhead mount page, opened to comments** (or closest stable URL pattern Wowhead supports).
- **Open in new tab**; accessible label (not just “link”).

**Acceptance**

- Clicking link lands on correct mount **and** comments area is visible or one click away (document if Wowhead changes hash behavior).

**Implemented**

- **`lib/wowheadCommentsUrl.ts`** — prefers **`commentsUrl`**, else **`wowheadUrl#comments`** (spell pages per **`docs/export-contract.md`**).
- **`components/WowheadCommentsLink.tsx`** — **`target="_blank"`**, **`rel="noopener noreferrer"`**, visible **Wowhead comments** + **`aria-label`** with mount name.
- **`app/page.tsx`** — link on **Top 10 mounts to farm** and **Your rarest mounts** rows.
- **`docs/wowhead-links.md`** — URL pattern, `#comments` note, what to update if Wowhead changes behavior.

---

## Epic D.2 — Icons on the website ✅ Complete

### Requirement D.2.1

- Show **mount icon** next to name in results (and optionally in future full lists).
- **Legal/safe path**: Blizzard **file ID** references rendered via allowed CDN/hosting **or** self-hosted icons only where license permits — **decide and document** before monetization.

**Acceptance**

- No broken images for pilot set; lazy-load or sprite strategy documented for performance.

**Implemented**

- **`lib/mountIconSrc.ts`** — resolves **`iconUrl`** only (API/override texture URLs; no synthetic `fileId.jpg` path).
- **`components/MountIcon.tsx`** — lazy **`img`**, next to name on **Top 10** and **rarest owned** rows (`app/page.tsx`).
- **`scripts/lib/blizzard-mount.mjs`** — enrich captures spell media **`icon.value`** → **`iconUrl`** on rows.
- **`scripts/enrich-mount-metadata.mjs`** — **`--ids=a,b,c`** for targeted refresh.
- **`data/mount-icon-overrides.json`** + **`lib/mounts.ts`** merge — pilot spell IDs when Blizzard spell API 404s; static ZAM texture URLs.
- **`docs/mount-icons.md`** — Tier 1 vs Tier 3, lazy-load, legal note.

---

## Epic D.3 — Richer results layout ✅ Complete

### Requirement D.3.1

- Preserve **decision-first** layout: top recommendations stay scannable; secondary detail (guide preview, links) expandable or below fold.

**Implemented**

- **`components/MountRowSecondaryDetails.tsx`** — native **`<details>` / `<summary>`** (closed by default): farm rows collapse **farm guide + Wowhead**; rarest-owned rows collapse **Wowhead** only. Summary label adapts when a guide is missing.
- **`app/page.tsx`** — farm row **decision line** stays **icon, name, location, boss, why**; short intro copy under both result headings explains the pattern.

---

## Epic D.4 — “Rarest you own” showcase ✅ Complete

### Requirement D.4.1

- After a valid paste, show **up to 10** mounts the player **owns** (spell ID in export ∩ dataset) ranked by the same **`scoreRarest`** logic used for recommendations — a light **“look what I have”** moment.
- Copy must clarify this is **not** farming advice; empty state explains how to expand the dataset (e.g. merge-stubs workflow).
- **Quality** of this list depends on **Phase B** harvest: stubs show as `Mount (spell N)` until the master baseline replaces them.

**Acceptance**

- List shows name + short context (e.g. location); no duplicate of farm list.

---

## Epic D.5 — Wowhead comment sentiment digest ✅ Complete

**Goal:** Expandable section shows **summarized community tips** (≤5 bullets) plus **Open full comments on Wowhead**; pilot coverage for six guide spell ids.

### Requirement D.5.1 — What the user sees

- **`MountRowSecondaryDetails`** uses **`WowheadCommentDigest`**: heading **Community tips (summarized)**, semantic **`<ul>`**, optional **asOf** note, primary outbound link.
- Empty digest + Wowhead URL: **No comment digest in our data yet** + link.

### Requirement D.5.2 — Positive score / provenance

- **Shipped tier:** human-edited **`data/wowhead-comment-digests.json`** (original summaries, not verbatim Wowhead posts). Future: scored comments + Tier B/C per **`docs/wowhead-digests.md`**.

### Requirement D.5.3 — Data model & pipeline

- **`Mount.wowheadCommentDigest`**, **`wowheadCommentDigestAsOf`** merged in **`lib/mounts.ts`** (cap **5** lines).
- **`npm run data:wowhead-digest`** → **`data/build/wowhead-digest-report.json`**; **`--strict-pilots`** for CI.

### Requirement D.5.4 — UI / legal

- **`components/WowheadCommentDigest.tsx`**; **`docs/wowhead-digests.md`**, **`docs/wowhead-links.md`** cross-link.

**Implemented**

- **`data/wowhead-comment-digests.json`** — six pilot spell ids (**40192**, **72286**, **60002**, **6648**, **71810**, **5784**).
- **`scripts/report-wowhead-digests.mjs`**, **`package.json`** script **`data:wowhead-digest`**.
- **`WowheadCommentsLink.tsx`** retained for reuse; expandable UI uses **`WowheadCommentDigest`** only.

---

## Epic D.6 — Pre-commercial harvest completeness gate ✅ Complete

**Goal:** Before **Phase F** monetization, prove **surface** data is harvested or **explicitly** excepted — not silently missing.

### Requirement D.6.1 — Required surface elements

| Element | “Complete” means |
|--------|-------------------|
| **Wowhead links** | **`wowheadUrl`** / **`commentsUrl`** on non-stub rows (or **`data/surface-exceptions.json`**) |
| **Web icon** | **≥ 95%** non-stub rows with resolvable **`http(s)`** icon (Tier 1 + **`mount-icon-overrides.json`**) or icon exceptions |
| **Digest / tips / guides** | Reported %; optional strict thresholds via env |

### Requirement D.6.2 — Automated checks

- **`npm run data:check-surface`** — static merge (same as **`lib/mounts.ts`**); % icon, Wowhead, comments, digest, farm tip, guide; top **N** spell ids missing icon; **`data/build/surface-check-report.json`**.
- **`--strict`** — exit **1** below **`SURFACE_*`** thresholds or on name-quality issues.

### Requirement D.6.3 — Documentation

- **`docs/data-harvesting.md`** — section **Pre-commercial completeness (Epic D.6)**.
- **`CONTRIBUTING.md`** — pre-commercial marketing paragraph.

**Implemented**

- **`scripts/check-mount-surface.mjs`**, **`package.json`** script **`data:check-surface`**.
- **`data/surface-exceptions.json`** — optional **`ignoreWowheadUrlForSpellIds`**, **`ignoreCommentsUrlForSpellIds`**, **`ignoreIconForSpellIds`**.

---

## Epic D.7 — Modern interaction & hyperlink polish ✅ Complete

**Goal:** Baseline web UX: link hover / focus-visible / active / visited; disclosure affordances; reduced motion.

### Requirements (summary)

- **D.7.1** — External links in main content: **2px** **`focus-visible`** ring, hover/active/visited styles; **`prefers-reduced-motion`** disables non-essential transitions.
- **D.7.2** — **`<details>`** / **`<summary>`**: hover + focus ring, CSS chevron (rotation off under reduced motion); native keyboard for open/close.
- **D.7.3** — Vanilla CSS in **`app/globals.css`** (tokens in **`:root`** for **D.8**); no new UI dependencies.

**Implemented**

- **`app/globals.css`** — **`.app-main`**, **`.expandable-row`**, **`expandable-row__panel`**, **`--link`** / **`--focus-ring`** CSS variables.
- **`app/page.tsx`** — **`className="app-main"`**; **`scrollIntoView`** uses **`auto`** when **`prefers-reduced-motion: reduce`**.
- **`components/MountRowSecondaryDetails.tsx`** — disclosure **`className`**s.

---

## Epic D.8 — Fantasy-forward visual layer (site chrome) ✅ Complete

**Goal:** WoW-adjacent parchment/gold/fel/arcane aesthetic; readable typography; cards; system dark mode; wider content column.

### Requirements (summary)

- **D.8.1** — CSS-only layered backgrounds; **Cinzel** + **Source Sans 3** (Google Fonts, OFL); card rows + icon tiles.
- **D.8.2** — Main column **`max-width: min(100vw - 2rem, 880px)`**; responsive padding.
- **D.8.3** — **`prefers-color-scheme: dark`** token overrides (links, surfaces, text).
- **D.8.4** — No 3D viewer / commissioned art.

**Implemented**

- **`app/layout.tsx`**, **`app/globals.css`**, **`app/page.tsx`**, **`components/MountIcon.tsx`**, **`MountGuideBlock.tsx`**, **`WowheadCommentDigest.tsx`**.

---

## Epic D.9 — UAT onboarding & home polish ✅ Complete (MVP)

**Goal:** Player-facing How To; collection disclosure; collapsible rarest showcase + title tweak; card-width text wrap; theme toggle with device default.

### Requirements (summary)

| ID | Item |
|----|------|
| D.9.1 | **How To** — CurseForge-style install copy; enable addon; **`/mountexport`** / **`/mynextmount`**; paste **`M:…`** (see live **`app/page.tsx`**). |
| D.9.2 | **View your mounts** — **`<details>`** “View your mounts (N)”; expanded: **2-column** grid of export, match to **`mounts`** dataset, **`scoreRarest`** as micro **white bar + green fill** (more green = rarer on site formula); unknown spell IDs listed without bar. |
| D.9.3 | **Your rarest mounts** — expandable + CTA; title without “in this dataset”. |
| D.9.4 | Wrapping — **`overflow-wrap`**, **`min-width: 0`**, **`.results-stack`**. |
| D.9.5 | **ThemeToggle** — Auto / Light / Dark, **`localStorage`**, **`data-theme`** + **`prefers-color-scheme`**. |

**Implemented**

- **`app/page.tsx`**, **`app/globals.css`**, **`components/ThemeToggle.tsx`**, **`components/OwnedMountsCollection.tsx`**, **`app/layout.tsx`** (**`suppressHydrationWarning`** on **`<html>`**).

**Follow-ups:** official CurseForge project URL when published; video; i18n paths; **virtualize** grid for very large collections (**G.2**) — root **`backlog.md`** parking lot.

---

## Epic D.10 — Filters, unbounded farm list & brand ✅ Complete

**Goal:** Let players narrow recommendations by **how mounts are obtained**; load farm results in **batches** instead of a hard cap at 10; align site + addon under **MyNextMount** / **mynextmount.com**.

### Requirements (summary)

| ID | Item |
|----|------|
| D.10.1 | **Source filters** — Checkbox groups by acquisition bucket (drops, vendor, shop, etc.) from `sourceCategory` / `source` prefix; toggling updates the sorted farm list; if **all** filters off, prompt to select at least one (`lib/mountSourceBucket.ts`, **`app/page.tsx`**). |
| D.10.2 | **Infinite scroll** — Initial **10** farm rows; **IntersectionObserver** sentinel loads **+10** until the filtered list is exhausted; **“Showing X of Y”** + end hint; full sort via **`sortMountsByScore`** (`lib/selectTopMountsByScore.ts`). |
| D.10.3 | **Copy** — Section title **“Top mounts to farm”** (no fixed “10” in the heading). |
| D.10.4 | **MyNextMount** — Site metadata, header wordmark + tagline, how-to + addon **`/mountexport`** / **`/mynextmount`**; addon **`.toc` Title**; **`npm` package `mynextmount`**; data scripts User-Agent **MyNextMount/0.1**. |
| D.10.5 | **Logo** — Optional: image in **`data/`** (`mynextmount-logo.*` or `*logo*`) copied to **`public/mynextmount-brand.*`** at dev/build via **`next.config.ts`** + **`NEXT_PUBLIC_BRAND_LOGO_URL`**. |

**Implemented**

- **`app/page.tsx`**, **`app/layout.tsx`**, **`app/globals.css`**, **`next.config.ts`**, **`.gitignore`**, **`lib/mountSourceBucket.ts`**, **`lib/selectTopMountsByScore.ts`**, **`addons/MountFarmExport/*`**, docs touch-ups.

**Follow-ups:** virtualize **farm** list if DOM cost matters at extreme lengths (**G.2**); CurseForge listing URL (**parking lot**).

---

# PHASE E — WoW 12.0 / Midnight addon constraints

## Epic E.1 — Research spike (blocking addon architecture) ✅ Complete

### Requirement E.1.1

- Track **official 12.0 addon patch notes**: what APIs removed, combat restrictions, load constraints, **clipboard** still available?, **SavedVariables** limits.

### Requirement E.1.2

- **Fallback designs** (pick at least one as official fallback):

  - **Export-only addon** + all heavy UI on website.
  - **Manual paste** from `/dump`-style output if clipboard restricted.
  - **Companion desktop helper** (out of game) — only if you accept scope creep.

**Acceptance**

- One-page **ADR** (`docs/adr-012-addon-strategy.md`): chosen approach and triggers for fallback.

**Implemented**

- **`docs/adr-012-addon-strategy.md`** — 12.0 research (wiki/API summaries, secret values, restricted actions, combat log deprecation, TOC), clipboard/SV notes, **primary = export + website**, fallbacks **A/B/C** with **triggers table**.
- **`docs/addon-install.md`** — pointer to the ADR for architecture / patch-strategy context.

---

# PHASE G — Quality, ops, and testing (archive)

## Epic G.1 — Regression tests ✅ Complete

### Requirement G.1.1

- Unit tests for: parse, filter-owned invariant, scoring determinism, **ordering of scored lists** (full sort + client slice).
- Fixture: small JSON + known export string → expected **head** of sorted recommendations (and invariant: no owned IDs in results).

**Implemented**

- **`vitest`** + **`npm run test`** / **`npm run test:watch`**.
- **`fixtures/g1-mount-catalog.json`** — six synthetic mounts with distinct easiest/rarest ordering among the unowned subset.
- **`tests/g1-regression.test.ts`** — `parseMountExport`, `filterUnownedMounts`, `scoreEasiest` / `scoreRarest` determinism, `sortMountsByScore` full order + first-three “head” for both modes vs export **`M:100001,100002`**.
- **`.github/workflows/ci.yml`** — runs **`npm run test`** before lint and build.

---

## Epic G.2 — Performance ✅ Complete

### Requirement G.2.1

- Site remains fast with **full mount list** (virtualize long lists if needed — **View your mounts** grid first for huge exports; then farm list if needed).

**Implemented**

- **`@tanstack/react-virtual`** — **`components/OwnedMountsCollection.tsx`** window-mounts rows when export size ≥ **`OWNED_MOUNTS_VIRTUALIZE_MIN` (48)**; each virtual row is one or two mounts matching the **600px** 1-column vs 2-column layout (`ResizeObserver` on the scroll viewport).
- Scroll + **`max-height: min(70vh, 28rem)`** moved to **`.owned-collection__viewport`**; **View your mounts** disclosure body no longer uses **`.disclosure-block__body--scroll`** (avoids nested scroll).
- **Farm list:** still **incremental DOM** via intersection observer + **`PAGE_SIZE`** batches (not thousands of cards at once); optional future **window** virtualization noted in parking lot if UX changes.

---

## Quick index (completed epics)

| Phase | Epics |
|-------|--------|
| **A** | A.1, A.2, A.2b, A.3, A.4 |
| **B** | B.0–B.8 |
| **C** | C.1–C.4 |
| **D** | D.1–D.10 (through filters, infinite scroll & brand) |
| **E** | E.1 |
| **G** | G.1, G.2 |

**Next work:** root **`backlog.md`** — **F.1** / **F.2** when you are ready to commercialize (or parking-lot polish).
