# Wowhead item pages vs spell pages (links only)

## Why this exists

Your site’s canonical id is the **mount summon spell id**. On Wowhead, the **item** that teaches the mount (bridle, reins, etc.) is usually where players discuss vendors, quirks, and tips — the same context as the in-game journal “teach item.”

We map spell → item in **`data/overrides/wowhead-item-by-spell.json`** (and optional **`wowheadItemId`** on a mount row). When an item id is known, **outbound links use**:

`https://www.wowhead.com/item=<itemId>#comments`

so the tab opens on **comments** for that item. If there is no mapping yet, the UI falls back to the **spell** URL with `#comments` and explains that you can add an item id to switch to the item page.

## Data: where the mapping lives

1. **`data/overrides/wowhead-item-by-spell.json`** — keys are **summon spell id** (strings), values are **Wowhead item ids** (numbers).

   Example (Chestnut Mare spell **6648** → bridle item **5655**):

   ```json
   {
     "6648": 5655
   }
   ```

2. Optional: set **`wowheadItemId`** on a row in **`data/mounts.json`**. The override file **wins** when both exist.

## Finding the item id (manual)

1. In-game or in the journal, note the item that teaches the mount.
2. On Wowhead, open that item; the URL contains `item=<number>`.
3. Add `"<spellId>": <itemId>` to the override file.

## Batch ingest (maintainer)

**`npm run data:ingest-wowhead-teach-item`** runs `scripts/ingest-wowhead-spell-teach-item.mjs`, which loads each mount’s spell page on Wowhead, reads the embedded “Taught by” item list, matches the teach item to **`mounts.json`** `name`, and merges into **`data/overrides/wowhead-item-by-spell.json`**. Use **`--apply`** to write the file; default is dry-run. **`--only-missing`** skips spell ids already in the map so you can resume after interruptions. Wowhead may return **HTTP 403** after sustained traffic — use a higher **`--delay-ms`** (e.g. 2000–3000), **`--max-retries`**, smaller **`--limit`** chunks, and rerun later. See **`docs/data-harvesting.md`** (Tier 3 / maintainer responsibility).

After updating overrides, run **`npm run addon:sync-guides`** so the addon guide source URLs stay aligned.

## Related docs

- **`docs/wowhead-digests.md`** — flavor + how-to copy in **`data/wowhead-comment-digests.json`** (OpenAI from metadata; no Wowhead scraping).
- **`docs/wowhead-links.md`** — link behavior summary.
