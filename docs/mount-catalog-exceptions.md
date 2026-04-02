# Mount catalog — intentional exceptions (Epic B.1)

**Scope:** [Retail](data-harvesting.md) mount summon **spell IDs** in `data/mounts.json`, aligned with `docs/export-contract.md`.

## Policy

- **Default:** Every Retail-obtainable mount the journal can learn should eventually appear in the master dataset with a **real name** and non-placeholder `source` / `location` (after the harvest pipeline runs).
- **“No exceptions”** means: among mounts **in scope**, there are **no silent gaps**. Anything we **choose** to skip must be listed here **and** in `data/catalog-exceptions.json` (`excludedSpellIds`).

## Categories we might exclude (document each ID)

| Category | Example | Rationale template |
|----------|---------|-------------------|
| Removed from game | — | No longer learnable; API may still list |
| GM / internal only | — | Not a realistic farm target |
| Duplicate spell / data bug | — | Same display as another row; document primary spell ID |
| Out of product scope | — | e.g. future: Classic-only mount if app is Retail-only |

## Current exclusions

| Spell ID | Name (if known) | Category | Rationale |
|----------|-----------------|----------|-----------|
| 459 | Gray Wolf | Never shipped | Datamined; not implemented in live Retail. |
| 581 | Winter Wolf | Never shipped | Same. |
| 10790 | Tiger | Never shipped | Same. |
| 18363 | Riding Kodo | Never shipped | Same. |
| 59572 | Black Polar Bear | Never shipped | Same. |
| 60136, 60140 | Grand Caravan Mammoth | Never shipped | Same (two journal rows / variants). |
| 62048 | Illidari Doomhawk | Never shipped | Same. |
| 123182 | Kafa Yak | Never shipped | Same. |
| 127209 | Black Riding Yak | Never shipped | Same. |
| 127213 | Modest Expedition Yak | Never shipped | Same. |
| 194046 | Swift Spectral Rylak | Never shipped | Same. |
| 239363 | Swift Spectral Hippogryph | Never shipped | Same. |
| 239766 | Blue Qiraji War Tank | Never shipped | Same. |
| 239767 | Red Qiraji War Tank | Never shipped | Same. |
| 28828 | “Nether Drake” (mis-keyed) | Not a mount spell | Not learnable as a mount on Retail; journal map pointed at wrong spell — real Netherwing drakes use other summon IDs. |
| 302794 | Swift Spectral Fathom Ray | Never shipped | Same. |
| 302795 | Swift Spectral Magnetocraft | Never shipped | Same. |
| 302796 | Swift Spectral Armored Gryphon | Never shipped | Same. |
| 302797 | Swift Spectral Pterrordax | Never shipped | Same. |

*(“Brewfest Kodo” from some cut lists is not present in our catalog under that exact name; no separate row.)*

## Machine-readable list

`data/catalog-exceptions.json` → `excludedSpellIds` must stay in sync with this table.

## Coverage check

Run `npm run data:check-coverage` (with Blizzard API credentials in env) to diff API spell IDs vs `mounts.json`. Missing IDs not in `excludedSpellIds` indicate **gaps** — refresh the baseline with **`npm run data:build`**, then overrides / Tier 3 as needed (B.4+).
