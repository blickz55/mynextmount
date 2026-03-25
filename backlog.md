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
- **Respect Blizzard & third-party ToS**: Prefer **official APIs** and **licensed/allowed** asset use over aggressive scraping or redistributing Wowhead content verbatim at scale.
- **12.0 / Midnight reality**: Assume Retail addon capabilities **may shrink**; design so **the website + static data** remain useful even if the addon is display-only or export-only.

---

## Shipped baseline (reference)

The app today: paste **`M:…`** → parse → filter owned → score (Easiest / Rarest) → **source filters** → sorted farm list with **infinite scroll** (batches of 10) + rarest-owned showcase; **View your mounts** grid + rarity bars; **MyNextMount** addon (**`/mountexport`**, **`/mynextmount`**); **Phase B** pipeline and **Phase C** guides/farm tips. Epic-level history (**A–E**, **B.8**, **D.1–D.10**): **`docs/backlog-archive.md`**. Operational docs: **`docs/export-contract.md`**, **`docs/data-harvesting.md`**, **`docs/guides.md`**, **`docs/adr-012-addon-strategy.md`**.

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

**Done (see archive):** **G.1** — Vitest regression tests (`npm run test`): parse, filter-owned invariant, scoring determinism, full sorted-list order + expected head; fixture **`fixtures/g1-mount-catalog.json`** + export **`M:100001,100002`**. CI runs tests before lint/build. **G.2** — **View your mounts** uses **`@tanstack/react-virtual`** when the export has **≥48** mounts (windowed rows, 1- or 2-column like the CSS breakpoint); farm recommendations stay **batched infinite scroll** (no full list in DOM at once).

---

# PHASE H — Responsive UX & navigation

**Done (see archive):** **H.1** — Viewport + safe-area + touch targets + **`docs/mobile-smoke-checklist.md`**. **H.2** — **`components/SiteBrand.tsx`**: logo + title + tagline (and optional coming-soon eyebrow) as one **`Link`** to **`/`**; **`.site-brand__home`** hover/focus styles in **`app/globals.css`**.

---

# PHASE I — Near-term polish (active)

*Promoted from the former parking lot — safe to execute in small PRs.*

## Epic I.3 — How To polish

**Goal:** Lower friction for first-time paste users.

### Requirement I.3.1

- Optional **short screen recording** or GIF (hosted where ToS allows) linked from How To.
- **Locale-aware hints** where install paths differ (e.g. Windows vs Mac shortcuts) — keep copy short.

**Acceptance**

- How To section updated with at least one clarity improvement you can measure (support questions, time-to-first-paste).

---

## Epic I.4 — Mount preview beyond spell icon

**Goal:** Richer recognition than spell icon alone, **without** violating Blizzard / asset rules.

### Requirement I.4.1

- Research **legal** options: journal-style still, official media APIs, or self-hosted art with clear license.
- If a path is green, spike UI (card thumbnail, lazy load, fallback to current **`MountIcon`**).

**Acceptance**

- ADR or **`docs/`** decision: chosen approach + why; optional thin implementation behind a flag.

---

## Epic I.5 — Farm list window virtualization (optional)

**Goal:** Cap DOM cost if users load **very large** visible farm lists (beyond current batched infinite scroll).

### Requirement I.5.1

- Evaluate **`@tanstack/react-virtual`** (or similar) for **`/tool`** farm **`ol`** when **`visibleFarm.length`** crosses an agreed threshold.
- Preserve infinite-scroll “load more” behavior and **variable-height** expandable rows.

**Acceptance**

- Only ship if profiling or UX justifies; otherwise document “not needed yet” in the same epic note.

---

## Epic I.6 — Full farm guide experience (all mounts)

**Goal:** Same rich expandable row (**guide + summarized tips + Why + links**) for **every mount in `data/mounts.json`**, using **governed** authoring — not bulk automated Wowhead scraping.

### Requirement I.6.1

- **Roadmap + metrics:** **`docs/guide-experience-roadmap.md`** defines layers (**`mount-guides.json`**, **`wowhead-comment-digests.json`**, **`farm-tips.json`**) and batch waves.
- **Coverage command:** **`npm run data:guide-experience`** → **`data/build/guide-experience-coverage.json`** (percentages + sample gaps).

### Requirement I.6.2

- **Progress in PRs:** expand coverage in **reviewable batches**; record provenance per **`docs/wowhead-digests.md`** / **`docs/farm-tip-llm-workflow.md`** when using LLM assist.

**Acceptance**

- Maintainer sets a **target threshold** (e.g. 100% of mounts with **`wowheadUrl`**, or 100% of catalog); epic closes when that threshold is met and **`data:guide-experience`** reflects it. Until then, the roadmap + script are the source of truth for “how far along we are.”

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

# Open questions (need your answers when possible)

1. **Target product**: Retail only, or Classic too? (Drives API and mount list.)
2. **Guide ownership**: Are *you* the only editor, or crowdsourced PRs?
3. **Hosting**: Stay local-only forever, or deploy publicly for others?
4. **Icon source**: OK with **self-hosted** extracted icons vs hotlinking — legal comfort level?

---

# Suggested execution order (prioritized)

| Priority | Epic | Why |
|----------|------|-----|
| **1** | **I.6** — Guide experience for all mounts | Roadmap + **`data:guide-experience`**; batched content PRs (see **`docs/guide-experience-roadmap.md`**). |
| **2** | **I.3** — How To polish | Faster first successful paste. |
| **3** | **I.4** — Mount preview | Differentiation; blocked on legal/technical spike. |
| **4** | **I.5** — Farm virtualization | Only if measured need. |
| **—** | **J.1–J.5** | Larger or **out-of-scope-until-promoted**; pick one after **I.*** or **`docs/business-strategy.md`** gates. |
| **✓** | **F.1** / **F.2** | **Shipped (strategy):** **`docs/business-strategy.md`**, **`docs/auth-strategy.md`**, **`types/entitlements.ts`**. |

**Do not implement auth Phase A or payments until** you intentionally clear the gates in **`docs/business-strategy.md`** §2. **Phase G** and **Phase H** are shipped.

---

*Scratch pad:* use GitHub issues or a one-line note here for **ad-hoc** ideas; **I.*** and **J.*** above are the promoted queue.

---

*Completed epics: **`docs/backlog-archive.md`** (through **D.10**, **G.1**, **G.2**, **F.1**, **F.2**, **H.1**, **H.2**, **I.1**, **I.2**). Last updated: parking lot promoted to **Phase I** + **Phase J**.*
