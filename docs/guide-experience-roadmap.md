# Roadmap: full farm guide experience for every mount

This document is the **execution path** to replicate the rich expandable row (written **farm guide**, **“Why”** line, **summarized community tips**, **Wowhead** link + disclaimer) for **all mounts in `data/mounts.json`** — without changing the product rule: **no bulk automated scraping** of Wowhead or other sites; **human review** before merge. See **`docs/data-harvesting.md`**, **`docs/guides.md`**, **`docs/wowhead-digests.md`**, **`docs/farm-tip-llm-workflow.md`**.

---

## What “full experience” means (three data layers)

The UI already renders the card when data exists (`lib/mounts.ts` merges these at load):

| Layer | File | Purpose |
|--------|------|---------|
| **Guide** | **`data/mount-guides.json`** | Overview + checklist + **sourceUrl** / **sourceLabel** (Epic C.1 / C.3 workflow). |
| **Community tips** | **`data/wowhead-comment-digests.json`** | Up to **5** reviewed paraphrase lines + **`asOf`** (Epic D.5). |
| **Why line** | **`data/farm-tips.json`** | Short one-liner merged into recommendation copy (optional LLM assist + review — Epic C.4). |

**“Rich panel” (matches the flagship screenshot):** at least **guide + digest** on the same mount. **Farm tip** improves the headline **Why** but is tracked separately.

---

## Governance (non-negotiable)

1. **Lawful inputs** for digest / tip workflows — manual excerpting or automation only where **ToU** / **robots.txt** clearly allow; see **`docs/wowhead-digests.md`** Tier 2 vs Tier 3.
2. **No verbatim Wowhead comments** in the repo; **paraphrase + review**.
3. **Provenance** — append batches to **`data/wowhead-digest-provenance.json`** and **`data/farm-tip-provenance.json`** when you use LLM-assisted drafts.

---

## How we measure progress

Run:

```bash
npm run data:guide-experience
```

Writes **`data/build/guide-experience-coverage.json`** and prints counts / percentages:

- mounts with **guide** (complete per merge rules),
- mounts with **non-empty digest**,
- mounts with **farmTip**,
- **`richPanelGuideAndDigest`** (both guide and digest),
- sample spell IDs still missing a guide (truncated).

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

---

## What we are not doing (until policy changes)

- **Unattended** HTML crawl of Wowhead comment threads into git.
- Shipping **raw** comment dumps.
- Claiming **100% guide coverage** in marketing until **`data:guide-experience`** (or a stricter gate you define) hits your chosen threshold.

---

## Backlog

Track macro progress under **Epic I.6** in **`backlog.md`**. Close the epic when **your** chosen target is met (e.g. 100% of mounts with **`wowheadUrl`** have digest + guide, or a published “v1 coverage” percentage).
