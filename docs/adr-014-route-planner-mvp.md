# ADR 014: Weekly lockout / route planner — problem framing and MVP slice (Epic J.2)

**Status:** Accepted (planning only — **no product build** in this ADR)  
**Date:** 2026-03-26  
**Epic:** J.2 — Weekly lockout / route planner

## Context

**MyNextMount** today answers: *given what I own, what should I farm next?* — a **ranked list** with guides and filters. A different question appears in chat and forums: *I have an hour before reset — which of my open lockouts should I hit in what order?* That is **route / session planning**, not ranking the whole catalog.

The dataset already carries coarse **cadence** on each mount: **`lockout`** is **`"daily"` | `"weekly"` | `"none"`** on **`Mount`** (`types/mount.ts`), plus **`timeToComplete`**, **`location`**, **`expansion`**. There is **no** structured zone graph, **no** guaranteed travel times, and **no** live Blizzard API for **per-character lockout state** on the static site.

Epic **J.2** requirement **J.2.1** is explicitly **problem statement + MVP slice before any build**. This ADR records that slice so a future implementation epic does not re-litigate scope in PR comments.

## Problem statement

1. **Player pain:** After using the farm list, some players want a **short, ordered checklist** for **one play session**, especially around **weekly** resets, without re-reading every guide row.
2. **Product boundary:** The site must not pretend to know **which lockouts the player has already cleared** unless that data is **user-supplied** or comes from a **future addon export** (out of scope for this ADR).
3. **Data reality:** We can group and sort by **metadata** (`lockout`, `timeToComplete`, `expansion`, `location` string) but cannot compute a true **optimal world tour** without coordinates and a travel model.

## Options considered (product shape)

| Option | Description | Verdict |
|--------|-------------|---------|
| **A. Full cross-character lockout sync** | Account-wide planner with API or cloud state. | **Deferred** — needs auth, storage, and/or rich addon protocol; not MVP. |
| **B. Map / TSP “optimal route”** | Minimize flight time using a zone graph. | **Deferred** — no zone graph in **`mounts.json`**; high maintenance. |
| **C. Session checklist from current farm list** | User picks a **subset** of mounts (from visible recommendations or search), then gets a **single-character** ordered list using simple heuristics. | **Accepted** as **MVP direction** when J.2 is implemented. |
| **D. Lockout-type-only view** | Filter/sort farm list by **`lockout === "weekly"`** (and similar) with no new planner UI. | **Partially exists** via source filters + list; **not** sufficient alone if we want explicit “session order.” |

## MVP slice (when implementation is scheduled)

**All of the following apply to a hypothetical first ship — not built until a follow-up epic/story.**

1. **Single character** — no multi-toon aggregation in v1.
2. **User-owned inputs only** — which mounts to include must come from **explicit user selection** (e.g. checkboxes on the current farm list, or a paste of spell IDs). The site does **not** infer cleared lockouts.
3. **Lockout focus — start with `weekly`** — first version optimizes copy and ordering for **`lockout === "weekly"`** targets; **`daily`** / **`none`** can be phase 2 or a toggle.
4. **Ordering heuristic (deterministic, explainable)** — e.g. sort selected rows by **`timeToComplete`** ascending, then **`name`**, with **no** claim of global optimality. Optional second sort key: **`expansion`** for “same expansion together.”
5. **Output format** — **static checklist** (numbered list + links to existing guide / Wowhead), printable or copy-friendly. **No** map, **no** calendar integration in MVP.
6. **Addon (optional later)** — a future **`M:`**-style or sidecar export of “my picks for this week” is compatible with **`docs/export-contract.md`** philosophy but is **not** part of this MVP slice.

## Explicit non-goals (MVP)

- Real-time lockout state from Blizzard APIs on the website.
- Shortest-path routing across Kalimdor / Eastern Kingdoms / etc.
- Promising “maximize drops per hour” without a drop model (we only have coarse **`dropRate`** heuristics for scoring elsewhere).

## Consequences

- **J.2.1 is satisfied** by this ADR; **no** UI or API work is required to close the planning requirement.
- A **future** story should reference this ADR and add **tests** for the ordering function and selection UX.
- If the product later adds **lockout state** from the addon, extend **`docs/export-contract.md`** (or a v2 appendix) before trusting planner output.

## References

- **`types/mount.ts`** — **`lockout`**, **`timeToComplete`**, **`location`**.  
- **`docs/export-contract.md`** — spell ID contract.  
- **`docs/adr-012-addon-strategy.md`** — addon vs website split.  
- Root **`backlog.md`** — Epic **J.2**.
