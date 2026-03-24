# Wowhead links (Epic D.1)

## What we link

The site uses **summon spell IDs** everywhere (`docs/export-contract.md`). Wowhead’s matching page is the **spell** URL:

`https://www.wowhead.com/spell=<id>#comments`

Rows store **`commentsUrl`** (with `#comments`) and **`wowheadUrl`** (spell page without hash) from **`npm run data:build`**. The UI prefers **`commentsUrl`** so the **comments** tab is the default landing target (Epic D.1).

## Behavior

- Links open in a **new tab** (`target="_blank"`, `rel="noopener noreferrer"`).
- **Epic D.5:** expandable rows use **Open full comments on Wowhead** for the outbound link; summarized bullets are separate — see **`docs/wowhead-digests.md`**.

## If Wowhead changes URLs

If `#comments` stops scrolling to the comments section, update **`lib/wowheadCommentsUrl.ts`** / row URLs in **`data/mounts.json`** (or overrides) and this doc. The **mount** journal page (`/mount=…`) uses a different id than our export spell id — we only switch if the product contract changes.
