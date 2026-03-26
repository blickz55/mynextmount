# Roadmap: full farm guide experience for every mount

This document is the **execution path** to replicate the rich expandable row (written **farm guide**, **“Why”** line, **mount spotlight** flavor + how-to bullets, **Wowhead** link to comments + disclaimer) for **all mounts in `data/mounts.json`**.

**Policy:** The maintainer may use **automated batch commands** (scripts + terminal) to fill **`mount-guides.json`**, **`wowhead-comment-digests.json`**, and **`farm-tips.json`**. **Human review is optional**; **third-party ToS and law** remain the **operator’s** responsibility. See **`docs/data-harvesting.md`** (*Maintainer override*), **`.cursorrules`** (*Content automation*), **`docs/guides.md`**, **`docs/wowhead-digests.md`**, **`docs/farm-tip-llm-workflow.md`**.

---

## What “full experience” means (three data layers)

The UI already renders the card when data exists (`lib/mounts.ts` merges these at load):

| Layer | File | Purpose |
|--------|------|---------|
| **Guide** | **`data/mount-guides.json`** | Overview + checklist + **sourceUrl** / **sourceLabel** (Epic C.1 / C.3 workflow). |
| **Mount spotlight** | **`data/wowhead-comment-digests.json`** | Optional **`flavor`** + up to **10** **`lines`** (how to obtain) + **`asOf`** (Epic D.5); prefer **`npm run content:mount-flavor-batch`** from metadata. |
| **Why line** | **`data/farm-tips.json`** | Short one-liner merged into recommendation copy (optional LLM assist + review — Epic C.4). |

**“Rich panel” (matches the flagship screenshot):** at least **guide + digest** on the same mount. **Farm tip** improves the headline **Why** but is tracked separately.

---

## Maintainer target (Epic I.6 acceptance)

**Default closure goal:** every mount that has a **`wowheadUrl`** in **`data/mounts.json`** also has a **complete guide** (per merge rules) **and** a **non-empty digest** (**`flavor`** and/or **`lines`** in **`wowhead-comment-digests.json`**).

- **Primary metric:** **`percentOfWowheadUrl.richPanelGuideAndDigest`** in **`data/build/guide-experience-coverage.json`** → **100** (or document a lower **v1** percentage here if you intentionally ship short).
- **Stretch:** **`percentOfWowheadUrl.fullExperienceGuideDigestFarmTip`** (adds **`farm-tips.json`**).
- **Catalog-wide %** (denominator = all mount rows) is still printed for context; **I.6** is defined against the **`wowheadUrl`** subset so unobtainable / linkless rows do not block closure if you later drop URLs.

**Epic I.6** — **closed** when **`percentOfWowheadUrl.richPanelGuideAndDigest`** is **100** (achieved after full-catalog **`content:mount-flavor-batch`** + existing guides). **Stretch** farm tips remain optional (**`farm-tips.json`**); track with **`fullExperienceGuideDigestFarmTip`** if you want a second wave.

---

## Governance (repo policy)

1. **Operator responsibility** — You choose how to obtain inputs (manual, API, fetch). **Compliance** with [Wowhead ToU](https://www.wowhead.com/terms-of-use) and similar is **your** call; the repo **authorizes** automation when you want it.
2. **Quality** — Prefer **paraphrase** over verbatim comment paste; avoid raw HTML dumps in git when practical.
3. **Provenance (recommended)** — Append batches to **`data/mount-flavor-provenance.json`** / **`data/wowhead-digest-provenance.json`** and **`data/farm-tip-provenance.json`** for auditability, even when skipping manual review.

---

## How we measure progress

Run:

```bash
npm run data:guide-experience
```

Writes **`data/build/guide-experience-coverage.json`** (**`schemaVersion`: 2**) and prints counts / percentages:

- mounts with **guide** (complete per merge rules),
- mounts with **non-empty digest**,
- mounts with **farmTip**,
- **`richPanelGuideAndDigest`** (both guide and digest),
- **`fullExperienceGuideDigestFarmTip`** (all three),
- the same metrics as **% of mounts with `wowheadUrl`** (`percentOfWowheadUrl`) — **primary I.6 progress signal**,
- sample spell IDs: missing guide, missing digest (among `wowheadUrl`), missing farm tip, missing rich panel (among `wowheadUrl`) — each truncated.

Existing reports still apply:

- **`npm run data:wowhead-digest`** — digest-only coverage vs **`wowheadUrl`** + pilot checks.
- **`npm run data:check-surface`** — broader surface audit (icons, links, comments URLs, etc.).

---

## Recommended waves (operational)

Work in **batches** (e.g. 25–100 mounts per PR) so review stays sane.

1. **Wave 0 — Baseline** — Run **`data:guide-experience`**; snapshot percentages in the PR that bumps coverage.
2. **Wave 1 — High intent** — Mounts users see most: top of **Easiest/Rarest** lists, shop mounts you already describe, or IDs that appear often in **`fixtures/my-collection-export.txt`** / real exports (stub overlap).
3. **Wave 2 — By source** — Iterate **`source` / `sourceCategory`** buckets from Tier 1 data (all raids, then vendors, then world drops, etc.).
4. **Wave 3 — Long tail** — Remaining rows; prioritize those with **`wowheadUrl`** so digest + **Open full comments** stays coherent.

Per mount, typical order:

1. Add or refresh **`farm-tips.json`** (quick **Why**).
2. Add **`wowhead-comment-digests.json`** (excerpt → **`wowhead-digest:draft`** → review) if you want community tips.
3. Add **`mount-guides.json`** (original overview + checklist; cite **sourceUrl**).

Then **`npm run addon:sync-guides`** when **`mount-guides.json`** changes.

### Automated guide drafts (LLM)

```bash
# Preview which rows would run (default first 10 missing guides)
npm run content:guides-batch -- --only-missing --dry-run

# Generate 25 guides → data/build/mount-guides-batch.json (gitignored)
npm run content:guides-batch -- --limit=25 --only-missing

# Merge into data/mount-guides.json and sync addon
npm run content:guides-batch -- --limit=25 --only-missing --apply
npm run addon:sync-guides
```

- **Env:** **`OPENAI_API_KEY`** or **`FARM_TIP_OPENAI_API_KEY`** or **`CONTENT_GUIDES_OPENAI_API_KEY`** in **`.env.local`** (uncommented `KEY=value` line); optional **`CONTENT_GUIDES_LLM_MODEL`**, **`CONTENT_GUIDES_LLM_DELAY_MS`**.
- **`--limit=0`** — no cap (whole filtered list; expensive).
- **`--spell-id=N`** — single mount.
- **`--force`** — overwrite an existing guide.
- Batches append to **`data/content-guides-provenance.json`**.

---

## Marketing honesty

- Do not claim **“official Wowhead”** or **100% human-verified** unless that is true.
- Optional: tie public claims to **`npm run data:guide-experience`** (or **`data:check-surface`**) thresholds you document.

---

## Backlog

**Epic I.6** is **closed** in **`backlog.md`** (primary target met). Use **`npm run data:guide-experience`** to watch the **stretch** farm-tip metric or to validate after future batch edits.
