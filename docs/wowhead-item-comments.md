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

## Related docs

- **`docs/wowhead-digests.md`** — flavor + how-to copy in **`data/wowhead-comment-digests.json`** (OpenAI from metadata; no Wowhead scraping).
- **`docs/wowhead-links.md`** — link behavior summary.
