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
| — | — | — | *None yet — add rows as needed.* |

## Machine-readable list

`data/catalog-exceptions.json` → `excludedSpellIds` must stay in sync with this table.

## Coverage check

Run `npm run data:check-coverage` (with Blizzard API credentials in env) to diff API spell IDs vs `mounts.json`. Missing IDs not in `excludedSpellIds` indicate **gaps** — refresh the baseline with **`npm run data:build`**, then overrides / Tier 3 as needed (B.4+).
