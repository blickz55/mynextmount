# MyNextMount — Product backlog (active)

**Active epics only** — what we are building **next**. Shipped epics and full history: **`docs/backlog-archive.md`**.

When you say *“Execute Story X.Y.Z”*, map to an epic below unless you override.

---

## North star

**Personal-first tool** (commercial optional later) that answers: *Given the mounts I already own, what should I farm next?* — with **trustworthy links**, **step-by-step guidance**, and an **in-game addon** that exports ownership into the website.

---

## Principles

- **Ownership is sacred**: Anything the player’s export says they **own** must **never** appear in “farm next” results (keep invariant across all features).
- **No fake completeness until we mean it**: Do not claim “all mounts” until the dataset and ID contract are verified against a real export.
- **Respect Blizzard & third-party ToS** (operator responsibility): Prefer **official APIs** for the **mount index**; **guides/digests/tips** may be filled with **automated batch** tools per **`docs/data-harvesting.md`** (*Maintainer override*) — you own compliance and copy quality.
- **12.0 / Midnight reality**: Assume Retail addon capabilities **may shrink**; design so **the website + static data** remain useful even if the addon is display-only or export-only.

---

## Shipped baseline (reference)

The app today: paste **`M:…`** → parse → filter owned → score (Easiest / Rarest) → **source filters** → sorted farm list with **infinite scroll** (batches of 10) + optional **name / spell-ID search** + rarest-owned showcase; **View your mounts** grid + rarity bars; **MyNextMount** addon (**`/mountexport`**, **`/mynextmount`**); **Phase B** pipeline and **Phase C** guides/farm tips. Epic-level history (**A–E**, **B.8**, **D.1–D.10**): **`docs/backlog-archive.md`**. Operational docs: **`docs/export-contract.md`**, **`docs/data-harvesting.md`**, **`docs/guides.md`**, **`docs/adr-012-addon-strategy.md`**, **`docs/adr-013-mount-preview-beyond-spell-icon.md`** (optional larger spell icon preview).

---

# PHASE B — Data pipeline (maintenance)

**Done (see archive):** B.0–B.8 — commands and provenance in **`docs/data-harvesting.md`**, **`docs/mount-icons.md`**.

---

# PHASE D — Website

**Done (see archive):** D.1–D.10 — UI through UAT polish, **source acquisition filters**, **unbounded farm list UX** (scroll to load more), and **MyNextMount** branding + optional logo from **`data/`**.

---

# PHASE F — Monetization & commercial (later)

**Done (see archive):** **F.1** — **`docs/business-strategy.md`** (what is sold today vs future, **§2 gates** before payments: stability checklist + **`npm run data:check-surface -- --strict`**, D.5/D.6 + Wowhead re-check, addon rules; **§3** privacy). **F.2** — **`docs/auth-strategy.md`**, **`types/entitlements.ts`**. Implement **auth Phase A** or **payments** only after **`docs/business-strategy.md`** gates are intentionally cleared.

---

# PHASE G — Quality, ops, and testing

**Done (see archive):** **G.1** — Vitest regression tests (`npm run test`): parse, filter-owned invariant, scoring determinism, full sorted-list order + expected head; fixture **`fixtures/g1-mount-catalog.json`** + export **`M:100001,100002`**. CI runs tests before lint/build. **G.2** — **View your mounts** uses **`@tanstack/react-virtual`** when the export has **≥48** mounts (windowed rows, 1- or 2-column like the CSS breakpoint). **I.5** — **Top mounts to farm** uses the same **≥48** threshold: **`useWindowVirtualizer`** + **`measureElement`** while keeping **batched load-more** (no full catalog in DOM at once). **I.6** — **guide + digest** (rich panel) for **100%** of mounts with **`wowheadUrl`**; **`npm run data:guide-experience`** (**`docs/guide-experience-roadmap.md`**).

---

# PHASE H — Responsive UX & navigation

**Done (see archive):** **H.1** — Viewport + safe-area + touch targets + **`docs/mobile-smoke-checklist.md`**. **H.2** — **`components/SiteBrand.tsx`**: logo + title + tagline (and optional coming-soon eyebrow) as one **`Link`** to **`/`**; **`.site-brand__home`** hover/focus styles in **`app/globals.css`**.

---

# PHASE I — Near-term polish

**Done (see archive):** **I.1**–**I.7** — listing URL, a11y, How To, mount preview ADR, farm list virtualization, full guide + digest coverage, **lightweight farm list + catalog search** on **`/tool`** (**`lib/farmListSearch.ts`**, **`docs/export-contract.md`** spell ID matching).

---

# PHASE J — Explore / larger bets (promoted, not committed)

*These are **in the backlog** for planning; do not start without re-scoping cost and product fit.*

## Epic J.1 — Transmog-adjacent filters

**Status:** **Out of scope** until explicitly promoted — product is mount-farming, not xmog sets.

### Requirement J.1.1

- If promoted: define user story + data model impact; otherwise leave as **won’t do** with one-line rationale in archive when closed.

---

## Epic J.2 — Weekly lockout / route planner

**Goal:** Cross-character or weekly route optimization (large scope).

### Requirement J.2.1

- Problem statement + MVP slice (single toon? single lockout type?) before any build.

---

## Epic J.3 — Classic / Mists / era datasets

**Goal:** Separate catalogs or modes vs one Retail-only app (**open question #1**).

### Requirement J.3.1

- Decision doc: one app vs split; drives **`docs/export-contract.md`** and **`data/`** layout.

---

## Epic J.4 — Internationalization (i18n)

**Goal:** Non-English UI and/or guide snippets.

### Requirement J.4.1

- Choose stack (e.g. `next-intl`) vs minimal string files; scope v1 locales.

---

## Epic J.5 — Backup export format

**Goal:** If Blizzard ships an **official** collection export, support it alongside or instead of **`M:…`**.

### Requirement J.5.1

- Track Blizzard announcements; extend **`docs/export-contract.md`** with **v2** when stable.

---

## Epic J.6 — In-game guide import (website → addon feedback loop)

**Goal:** Close the loop: after the site ranks **top farm targets** for the player, let them pull the **AI-assisted / curated guide text** (summaries, steps, tips — same lineage as **`mount-guides.json`** / site expandable rows) **into the MyNextMount addon** so they can read it **in-game** without alt-tabbing.

### Requirement J.6.1

- **Product slice:** Define how the player selects **which mounts** to sync (e.g. top *N* from current tool results, or explicit picks) and what payload shape the addon accepts (size limits, UTF-8, versioning).
- **Transport:** Choose a practical path under addon constraints — e.g. **paste buffer** (generated block the site copies; addon **`/importguides`** parses), or **optional** file drop / companion step if allowed; document in **`docs/export-contract.md`** or a sibling **`docs/guide-import-contract.md`**.
- **In-game UX:** Addon panel or slash command listing imported mounts with **scrollable text**, **staleness** indicator or “refresh from site” hint, and clear fallback when a mount has no guide.

### Requirement J.6.2

- **Governance:** Imported text must respect the same **provenance / disclaimer** posture as the site (see **`docs/guides.md`**, **`docs/wowhead-digests.md`**); no implication that Blizzard endorses generated copy.

**Acceptance**

- Working **round-trip story** documented end-to-end: **export** → site farm list → **import guides** for at least those mounts → readable in-game; plus a short note in **`docs/adr-012-addon-strategy.md`** (or ADR) if strategy shifts.

---

# Open questions (need your answers when possible)

1. **Target product**: Retail only, or Classic too? (Drives API and mount list.)
2. **Guide ownership**: Are *you* the only editor, or crowdsourced PRs?
3. **Hosting**: Stay local-only forever, or deploy publicly for others?
4. **Icon source**: OK with **self-hosted** extracted icons vs hotlinking — legal comfort level?

---

# Suggested execution order (prioritized)

| Priority | Epic | Why |
|----------|------|-----|
| **1** | **J.* (pick one)** | **Phase I** clear; next bets are **J.1–J.6** or maintenance — see rows below. |
| **—** | **J.1–J.6** | Larger or **out-of-scope-until-promoted**; pick after **`docs/business-strategy.md`** gates if needed. (**J.6** = website → addon guide import / feedback loop.) |
| **✓** | **F.1** / **F.2** | **Shipped (strategy):** **`docs/business-strategy.md`**, **`docs/auth-strategy.md`**, **`types/entitlements.ts`**. |

**Do not implement auth Phase A or payments until** you intentionally clear the gates in **`docs/business-strategy.md`** §2. **Phase G** and **Phase H** are shipped.

---

*Scratch pad:* use GitHub issues or a one-line note here for **ad-hoc** ideas; **J.*** above is the promoted exploration queue.

---

*Completed epics: **`docs/backlog-archive.md`** (through **Phase I** including **I.7** mount search). **Next:** **Phase J** when you pick a bet.*
