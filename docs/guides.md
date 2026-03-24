# Mount farm guides (Epic C.1 / C.2 / C.3)

## Harvesting workflow (Epic C.3)

This is the **human-in-the-loop** process for adding or updating entries in **`data/mount-guides.json`**. It complements **Tier 1** facts from **`npm run data:build`** (`name`, `source`, `sourceCategory`, links) and the policy in **`docs/data-harvesting.md`**. It does **not** replace Phase B scripts or bulk-scrape Wowhead.

### Roles

- **Research:** Open the primary page (usually [Wowhead](https://www.wowhead.com/) spell/item/quest/NPC or an official Blizzard article). Skim comments only for *hints*; do not paste comment text into the repo.
- **Draft:** Write **`overview`** and **`checklist`** in **your own words** — short, accurate, cautious where Retail rules change by patch.
- **Cite:** Set **`sourceUrl`** to the best *stable* page for that mount (item, spell, boss, or guide section). Set **`sourceLabel`** so screen readers and users know where the link goes.

### Step-by-step (new guide)

1. Confirm the **summon spell id** matches **`data/mounts.json`** **`id`** (and **`docs/export-contract.md`**). Wrong id = wrong row everywhere (site, addon, export).
2. Read **`source` / `sourceCategory`** on that row from Tier 1 data — your guide should not contradict them without a note (e.g. “legacy; verify on Wowhead”).
3. Draft **3–6** checklist lines: ordered, actionable, **text-only** (no 3D navigation).
4. Add the JSON object under **`guides["<spellId>"]`** (string key).
5. Run **`npx tsc --noEmit`**, **`npm run addon:sync-guides`**, then verify **web** (unowned mount in recommendations) and **`/mfguides`** in-game after **`/reload`**.
6. In the PR description, list **spell id**, **sourceUrl**, and one line on what you verified (e.g. “lockout + difficulty on Wowhead 12.x”).

### Optional: stub from API, then human pass

You do **not** need a separate generator: **`npm run data:build`** already fills **`mounts.json`** with **`name`**, **`source`**, **`wowheadUrl`**, **`commentsUrl`**. For a new mount after a patch:

1. Run **`data:build`** (and **`data:apply-scores`** if needed) so the row exists.
2. Add **`mount-guides.json`** entry by hand from research — **no commit** of raw HTML or long copied guides.

### What not to do

- Do not bulk-ingest Wowhead comments or Reddit threads into JSON (see **Epic C.4** / **`docs/data-harvesting.md`** — Phase B boundary and optional LLM path).
- Do not ship **`MountFarmGuides.lua`** by hand; always **`npm run addon:sync-guides`** after JSON changes.

### Quality bar (summary)

Same as below; treat every guide as **player safety + trust**: if unsure, use cautious language and link **`sourceUrl`**.

---

## Data file

- **`data/mount-guides.json`** — `schemaVersion`, then **`guides`**: object keyed by **summon spell id** (string), each value:
  - **`overview`** — short original summary (do not paste long proprietary guide text).
  - **`checklist`** — array of ordered steps the player can check off.
  - **`sourceUrl`** — primary citation (Wowhead item/spell/NPC, official article, etc.).
  - **`sourceLabel`** — short label for the link (accessibility + trust).

Guides are merged onto mount rows in **`lib/mounts.ts`** (same pattern as **`farm-tips.json`**).

## Web UI

- **`components/MountGuideBlock.tsx`** renders under each **Top 10 mounts to farm** row when a guide exists.
- Checklist state is **browser-only** (resets on refresh). The **addon** persists checks — see below.

## Addon (Epic C.2)

1. After editing **`data/mount-guides.json`**, run **`npm run addon:sync-guides`** — regenerates **`addons/MountFarmExport/MountFarmGuides.lua`** (do not hand-edit that file).
2. In-game: **`/mfguides`** or **Esc → Options → AddOns → MyNextMount → Open farm guide window**.
3. **Prev / Next** cycles pilot mounts. **Copy source URL** opens a dialog (same pattern as the website URL copy). **No HTTP** from the addon.
4. **SavedVariables:** **`MountFarmExportDB.guideChecks[spellId][stepIndex]`** — stored **per account** (all characters on the realm group share the same SavedVariables file for that account). Survives **`/reload`** and relog.

## Quality bar

1. **Original wording** — paraphrase facts; link out for long strategies.
2. **Verify** obtainability, difficulty, and lockout on Wowhead before claiming specifics in **overview** (use cautious language when rules drift by patch).
3. **Diverse pilots** — include raid drop, world drop, vendor, achievement/legacy, quest/class examples when expanding beyond the initial set.

## Adding a guide

1. Look up the mount’s **summon spell id** (`data/mounts.json` **`id`** / export `M:` list).
2. Add an entry under **`guides["<id>"]`** in **`mount-guides.json`**.
3. Run **`npx tsc --noEmit`**, **`npm run addon:sync-guides`**, and spot-check on the site + in-game **`/mfguides`**.
