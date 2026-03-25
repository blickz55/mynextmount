# ADR 012: Addon vs website split and 12.0+ fallbacks

**Status:** Accepted  
**Date:** 2026-03-24  
**Epic:** E.1 — Research spike (blocking addon architecture)

## Context

Retail **Midnight / patch 12.x** introduced large-scale **AddOn security** changes aimed at limiting addons that **derive combat decisions** from rich runtime data. This project’s WoW addon (**`addons/MyNextMount/`**) is **not** a combat mod: it reads the **Mount Journal** (`C_MountJournal`), builds the **`M:`** export string (`docs/export-contract.md`), and shows it in an **EditBox** for the player to copy. Recommendations and guides are consumed on the **website** (or as static text in the guide UI).

We still need a written strategy because:

- Future patches may tighten **secure execution**, **events**, or **UI** patterns unrelated to combat.
- **Clipboard** in WoW has never been a first-class programmatic API; we depend on **user Ctrl+C** from a frame.
- **SavedVariables** growth and load-time cost remain a maintenance risk for checklist persistence.

**Primary references (reconcile with each patch):**

- Community API deltas: [Patch 12.0.0/API changes](https://warcraft.wiki.gg/wiki/Patch_12.0.0/API_changes), [12.0.1](https://warcraft.wiki.gg/wiki/Patch_12.0.1/API_changes), index [API change summaries](https://warcraft.wiki.gg/wiki/API_change_summaries).
- Blizzard UI source deprecation stubs (linked from the 12.0.0 wiki page), e.g. `Blizzard_DeprecatedCombatLog`, `Blizzard_DeprecatedSpellBook`, etc.

## Research summary (12.0 — high level)

The following is **not** legal advice and must be re-checked against **live client behavior** and **official Blizzard / UI dev communications** each tier.

| Area | What changed (12.0 per wiki + UI deprecation layout) | Relevance to MyNextMount |
|------|--------------------------------------------------------|--------------------------------|
| **Combat / secrets** | New **secret value** plumbing (`C_Secrets.*`, `canaccesssecrets`, widget secret aspects) and messaging that addons should not use raw combat/unit data for **automated decision-making**. Deprecated combat-log–related globals moved behind deprecation addons. | **None** for export path: we do not subscribe to `COMBAT_LOG_EVENT_UNFILTERED` or similar for core features. |
| **Restrictions** | `C_RestrictedActions.GetAddOnRestrictionState` / `IsAddOnRestrictionActive`, event **`ADDON_RESTRICTION_STATE_CHANGED`**. | Monitor if Blizzard ever buckets **non-combat** UI (e.g. journal scraping) into restricted modes; today journal APIs are the intended surface. |
| **Combat log** | `C_CombatLog.IsCombatLogRestricted` and filtered combat log events; legacy unfiltered combat APIs deprecated. | **Out of scope** unless we add combat features (we should not). |
| **TOC / interface** | Wiki lists TOC **`120000`** for 12.0.0 (bump **`MyNextMount.toc`** `## Interface` with each supported retail build). | Release hygiene only. |
| **Clipboard** | Still **no** stable server-side “copy string to OS clipboard” API for arbitrary text. Practical pattern remains **EditBox** + user **Ctrl+A** / **Ctrl+C** (documented in **`docs/addon-install.md`**). | If EditBox selection or focus is ever blocked in a context we use, switch to **Fallback B**. |
| **SavedVariables** | No new hard cap published in this ADR’s sources; WoW still serializes SV to disk. Risk is **size** and **load time**, not a numeric quota. | Keep **`MyNextMountDB`** small: prefs + **`guideChecks`** sparse table only; never store the full mount list in SV. |

## Decision

### Primary architecture (retain)

**Export-first addon + website for heavy UX** (already implemented).

- **In-game:** generate **`M:`** string, optional **farm guide** window with baked **Lua** data (`npm run addon:sync-guides`), **SavedVariables** only for checklist booleans and prefs (`docs/guides.md`, `docs/addon-install.md`).
- **Out of game:** paste into the site for scoring, links, and layout (**Epic D.x**).

This matches Blizzard’s stated split between **cosmetic / journal** style addons and **combat automation** targets.

### Official fallbacks (in priority order)

1. **Fallback A — Export-only addon (same as primary)**  
   If the **guide UI** breaks under new UI APIs, **strip or gate** the guide window and ship **export-only** until fixed. Website remains the source of truth for long-form content.

2. **Fallback B — Manual paste from `/dump` or chat output**  
   **Trigger:** player cannot copy from our EditBox (focus, selection, or future restriction), or addon load fails entirely.  
   **Mitigation:** document a **manual procedure**: use Blizzard’s **macro/script** or **`/dump`**-style steps to print collected spell IDs to chat or a log, then paste into the site. (Exact `/dump` recipe should live in **`docs/addon-install.md`** when this fallback is activated — not duplicated here.)

3. **Fallback C — Companion desktop helper**  
   **Not adopted** unless Fallback A+B are insufficient *and* the maintainer explicitly accepts scope (packaging, signing, OS support). Triggers: persistent inability to get text out of the client by any supported means.

## Consequences

- **Positive:** Architecture is already aligned with the restrictive direction of 12.x; combat API loss does not block the product thesis.
- **Negative:** We must **watch patch notes** and **`ADDON_RESTRICTION_STATE_CHANGED`** behavior; journal APIs could theoretically be constrained later.
- **Process:** On each major patch, smoke-test **`/mountexport`**, guide window **`/mnguides`** / **`/mfguides`**, and **SavedVariables** reload; update **`.toc` interface** and this ADR’s research blurb if the wiki/API summary shows journal-relevant removals.

## Triggers (when to invoke fallbacks)

| Signal | Action |
|--------|--------|
| `C_MountJournal` missing or errors on supported Retail | Document; consider Fallback B; open issue to follow Blizzard bug forums. |
| EditBox copy path broken for typical users | Fallback B + shorten export (`export-contract` **v2** chunking if string size is the limiter). |
| Guide UI frames error on login | Fallback A: disable guide module in TOC or runtime guard; website guides unchanged. |
| SV file warnings / slow login | Audit **`guideChecks`** size; prune orphaned keys; never store full ID lists in SV. |

## Links

- Install & clipboard notes: **`docs/addon-install.md`**
- Export format: **`docs/export-contract.md`**
- Guide sync & SV schema: **`docs/guides.md`**
