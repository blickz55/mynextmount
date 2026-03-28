# Wowhead links (Epic D.1)

## What we link

The site keys mounts by **summon spell id** (`docs/export-contract.md`). **Outbound “comments on Wowhead” links** prefer the **item** that teaches the mount when **`wowheadItemId`** is set (from **`data/overrides/wowhead-item-by-spell.json`** or the mount row):

`https://www.wowhead.com/item=<itemId>#comments`

That matches the journal item context where discussion usually lives. The UI states that the link opens the **comments** section on purpose.

If no item id is mapped, we fall back to the spell URL from **`wowheadUrl`** / **`commentsUrl`** (still with **`#comments`**) and label it as the spell page until an override exists.

## Behavior

- Links open in a **new tab** (`target="_blank"`, `rel="noopener noreferrer"`).
- **Epic D.5:** expandable rows show **Quick steps** (and optional flavor) plus a separate Wowhead link — see **`docs/wowhead-digests.md`**.

## If Wowhead changes URLs

If `#comments` stops scrolling to the comments section, update **`lib/wowheadCommentsUrl.ts`** / row URLs in **`data/mounts.json`** (or overrides) and this doc.
