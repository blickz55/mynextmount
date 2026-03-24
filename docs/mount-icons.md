# Mount icons on the website (Epic D.2)

## Source of truth

- **`iconUrl`** (optional): full HTTPS URL for the **spell icon** image.
  - **Tier 1:** Blizzard **spell media** `assets[]` entry with `key === "icon"` and a `value` URL — written by **`npm run data:enrich-metadata`** (`scripts/lib/blizzard-mount.mjs` also stores **`iconFileId`** for tooling; the **site does not** build a URL from id alone — see below).
  - **Tier 3:** Rows listed in **`data/mount-icon-overrides.json`** get a **static `iconUrl`** when the row has no URL yet. Used where **`/data/wow/spell/{summonSpellId}`** returns **404** (common for some mount summon spells; see [Blizzard API forum threads](https://us.forums.blizzard.com/en/blizzard/)).

Icons match the mount’s **summon spell** (same numeric **`id`** as the export).

## CDN behavior

- Blizzard often serves icons as  
  `https://render.worldofwarcraft.com/us/icons/56/<texture>.jpg`  
  (texture **filename**, not `file_data_id` in the path). Hotlinking from **`wow.zamimg.com`** is limited to **committed** texture URLs in **`mount-icon-overrides.json`** — no live scraping.

## Legal / hosting

- Prefer **Blizzard-hosted** URLs from the Game Data API.
- **ZAM / Wowhead CDN** links in **`mount-icon-overrides.json`** are **fixed** game icon assets (same art Blizzard ships); re-check [Wowhead Terms of Use](https://www.wowhead.com/terms-of-use) and [Blizzard Developer](https://develop.battle.net/) terms before monetization.

## UI behavior

- **`components/MountIcon.tsx`**: **`<img loading="lazy" decoding="async">`**, fixed width/height, **`alt=""`** (mount name is beside the icon).
- Rows **without** `iconUrl` after merges show **no** icon (no broken image).

## Refreshing icons

- **Catalog coverage (Epic B.8):** **`npm run data:sync-spell-icons`** — joins **Wago Tools** [SpellMisc CSV](https://wago.tools/db2/SpellMisc/csv) + **wowdev/wow-listfile** [`community-listfile.csv`](https://github.com/wowdev/wow-listfile/releases/latest/download/community-listfile.csv), writes **`data/baseline/spell-icon-textures.json`**, and fills **`data/mount-icon-overrides.json`** with Blizzard **`render.worldofwarcraft.com/.../icons/56/...jpg`** URLs for rows that still lack **`iconUrl`** (skips existing override URLs unless **`--force-overrides`**). Cached downloads live under **`data/build/cache/spell-icon-map/`** (gitignored).
- Tier 1 spell media: **`npm run data:enrich-metadata`** (subset: **`--ids=... --force-refresh`**).
- Manual pilots: add or edit **`data/mount-icon-overrides.json`** (ZAM URLs, etc.).

## Performance

- **Lazy-load:** one `loading="lazy"` image per visible row. For very long lists later, consider **`next/image`** with **`remotePatterns`** or a sprite sheet — document any change here.
