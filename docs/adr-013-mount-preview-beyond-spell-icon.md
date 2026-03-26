# ADR 013: Mount preview beyond the spell icon (Epic I.4)

**Status:** Accepted  
**Date:** 2026-03-25  
**Epic:** I.4 — Mount preview beyond spell icon

## Context

Farm and collection rows use **`MountIcon`**: the **summon spell** texture (see **`docs/mount-icons.md`**). Players sometimes want **richer visual recognition** (journal-style art, 3D stills, etc.). Anything we ship must stay inside the same **operator responsibility** frame as the rest of the site: **Blizzard Developer** terms, **Battle.net** acceptable use, and **third-party CDN** terms where we hotlink fixed URLs.

This ADR is **not** legal advice; re-check live policies before monetization or large UX bets.

## Options considered

| Option | Description | Verdict |
|--------|-------------|---------|
| **A. Larger spell texture (same asset)** | Use the **same** icon file with a **higher-resolution path** on Blizzard’s render CDN (e.g. `…/icons/56/…` → `…/icons/128/…`) or bump ZAM **`small`/`medium`** paths to **`large`** where overrides use that pattern. | **Accepted** for an optional spike: **no new art**, same licensing envelope as today’s **`iconUrl`**, **`onError` fallback** to the canonical URL. |
| **B. Journal / mount collection stills** | Pull “official” journal images from an undocumented surface or scrape HTML. | **Rejected** — brittle, unclear redistribution rights, high compliance risk. |
| **C. Wowhead / third-party mount viewer captures** | Screenshots or automated pulls from model viewers. | **Rejected** — not our IP; ToS and consistency issues; duplicates maintenance. |
| **D. Self-hosted licensed art** | Maintainer-uploaded JPEGs with explicit license metadata in repo. | **Deferred** — valid for a future data field (e.g. optional `previewImageUrl`); not required for the I.4 spike. |
| **E. Official Game Data API “mount media”** | A first-class mount preview URL from **`/data/wow/mount/{id}`** or related. | **Not available** at decision time for a dedicated preview image; spell **`icon`** media remains the supported still. |

## Decision

1. **Document** that “preview beyond icon” for this epic means **sharper spell icon**, not journal or 3D art, until a green **self-hosted** or **official API** path exists.
2. **Implement** an **optional** UI path behind **`NEXT_PUBLIC_MOUNT_PREVIEW_LARGE=1`**: **`components/MountIcon.tsx`** requests a **larger candidate URL** derived from the existing **`iconUrl`** (`lib/mountPreviewLargeSrc.ts`). On **`error`**, fall back to the **original** URL (current behavior).
3. **Do not** add runtime dependencies on Wowhead pages, bulk image scraping, or new pipelines in **`data/wowhead-comment-digests.json`** for previews.

## Consequences

- **CDN variance:** Some larger paths may **404 or 403** in edge cases; **fallback** keeps the UI stable.
- **Build flag:** Preview mode is **opt-in** per deploy so operators can validate sharpness and policy comfort before defaulting on.
- **Future work:** If Blizzard documents stable larger icon sizes or mount preview media, extend **`largerSpellIconCandidate`** or add an explicit **`previewUrl`** field with provenance in **`docs/mount-icons.md`**.

## References

- **`docs/mount-icons.md`** — spell icon tiers, CDN notes, legal pointers.  
- [Blizzard Developer portal](https://develop.battle.net/) — API terms.  
- [Wowhead Terms of Use](https://www.wowhead.com/terms-of-use) — third-party asset links in overrides.
