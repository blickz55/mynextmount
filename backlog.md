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

The app today: paste **`M:…`** → parse → filter owned → score (Easiest / Rarest) → **source filters** → sorted farm list with **infinite scroll** (batches of 10) + optional **name / spell-ID search** + rarest-owned showcase; **View your mounts** grid + rarity bars; **MyNextMount** addon (**`/mountexport`**, **`/mynextmount`**); **Phase B** pipeline and **Phase C** guides/farm tips. Epic-level history (**A–E**, **B.8**, **D.1–D.10**): **`docs/backlog-archive.md`**. Operational docs: **`docs/export-contract.md`**, **`docs/data-harvesting.md`**, **`docs/guides.md`**, **`docs/adr-012-addon-strategy.md`**, **`docs/adr-013-mount-preview-beyond-spell-icon.md`** (optional larger spell icon preview), **`docs/adr-014-route-planner-mvp.md`** (J.2 route planner MVP — planning only).

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

*These are **in the backlog** for planning; do not start without re-scoping cost and product fit. **J.1** (transmogs) is **out of scope post-launch** — see that epic below.*

## Epic J.1 — Transmog-adjacent filters

**Status:** **Out of scope post-launch** — not on the roadmap until after a stable **MyNextMount** launch; transmog-adjacent work is too large and off-product (mount-farming only). See **`docs/backlog-archive.md`** for the recorded decision.

### Requirement J.1.1

- **Won’t do (for now).** Reopen only if product strategy explicitly expands beyond mount farming.

---

## Epic J.2 — Weekly lockout / route planner

**Goal:** Cross-character or weekly route optimization (large scope).

### Requirement J.2.1 ✅ (planning)

- **Done:** **`docs/adr-014-route-planner-mvp.md`** — problem statement, constraints, MVP slice (**single character**, user-selected mounts, **`weekly`** focus first, deterministic ordering heuristic, checklist output; **no** build in that ADR).

### Next (implementation — not started)

- Ship a **session checklist** UX + **`lockout` / `timeToComplete`** sort when this epic is prioritized; follow **ADR 014** scope until explicitly expanded.

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

## Epic J.7 — Authenticated accounts & persistent collection (“platform” layer)

**Status:** **MVP implemented** — email/password auth, saved spell-ID collection, `/account` dashboard + weekly farm slice, GDPR-style delete; **anonymous `/tool` unchanged**. Details and env: **`docs/j7-accounts.md`**. **Production** exposure of auth remains **gated** on **`docs/business-strategy.md`** §2 (**F.1**) — same rule as **F.2** Phase A. **Strategy anchors:** **`docs/auth-strategy.md`**, **`docs/business-strategy.md`**, **`types/entitlements.ts`**.

**Goal:** Move from **“paste → analyze → leave”** to **“track → optimize → return”**: authenticated users keep a **living mount vault**, optional **weekly plans**, and (later) **multi-character** and **lockout-aware** depth — without paywalling the existence of the core anonymous tool.

### Why it matters (benefits)

| Benefit | What changes for the user |
|--------|---------------------------|
| **Stickiness** | Collection and preferences survive sessions; the site becomes a default place to check progress. |
| **Lower friction** | After first save, **optional** “no paste every visit” if we store last-known collection server-side and offer **re-import** from addon (`M:…` or future format). |
| **Personalization** | Rankings and “top N to farm” can weight **their** missing set, time budget, and (eventually) lockouts — not one-size-fits-all. |
| **Addon loop** | Sets up **J.6**-class and **export-contract** evolution: site holds truth or snapshots; addon **export/import** strings tighten the game ↔ site loop. |
| **Monetization alignment** | **Free authenticated** = vault + basics; **premium** = depth (optimization, routing, richer automation) — **don’t paywall the tool; paywall the power** (per **F.1**). |

### Requirement J.7.1 — Persistent mount repository (core)

- **Save collection to account** after paste (or explicit “Save to my profile”); store **normalized spell IDs** + **updated-at** metadata; support **replace** on re-import.
- **Views:** collected vs missing, **% completion**, breakdowns by **expansion** / **sourceCategory** (reuse existing catalog fields where possible).
- **Invariant:** Owned mounts from saved data **never** appear in farm-next lists (same as today’s paste model).

### Requirement J.7.2 — Weekly engagement loop

- **“Weekly mount plan”** (authenticated): surface a small set of **top targets** (e.g. 10) with rotation / freshness so users have a reason to return weekly.
- **Enhancements (later):** lockout-aware copy (“you can hit X of these this week”), reset-aware hints — overlaps **J.2** / **ADR 014**; avoid duplicating route-planner scope in v1.

### Requirement J.7.3 — Multi-character & account intelligence (later tranche)

- Multiple **characters** (or tags) per account; optional assignment of **which alt farms which** mount or instance.
- **Output examples** (product direction): “spread ICC across alts this week for more Invincible pulls” — **implementation** waits until weekly planner and auth data models are stable.

### Requirement J.7.4 — Progress dashboard & motivation

- **Dashboard:** completion %, **recently acquired** (if we track history or import diffs), “mounts left in **expansion**,” rough **time-to-farm** signals from existing heuristics.
- **Light gamification (optional):** streaks, milestones (50% / 75%), “closest to done” — must stay tasteful and skippable.

### Requirement J.7.5 — Personalized recommendations (authenticated delta)

- **Anonymous:** current behavior (global scores + filters).
- **Signed-in:** “Top N **for your account**” using saved missing set + same scoring inputs; premium can add **deeper** optimization (see **F.1** / **`Entitlements`**).

### Requirement J.7.6 — Addon sync (critical integration)

- **Today:** manual paste of **`M:…`**.
- **Target:** documented **import/export** loop — e.g. addon generates payload → site ingests → site emits **plan or checklist blob** → addon displays/highlights (align with **J.6** and **`docs/export-contract.md`**).
- **Principle:** Blizzard addon rules stay respected (no paywalled gameplay in-addon per **`docs/auth-strategy.md`**).

### Implementation plan (phased — groomed)

| Phase | Scope | Notes |
|-------|-------|-------|
| **J.7-a** | **Identity MVP** | **Phase A** from **`docs/auth-strategy.md`** (email/password or managed auth); sessions, CSRF, rate limits; minimal profile. |
| **J.7-b** | **Collection API** | CRUD for “my mounts” snapshot; versioning; GDPR-style delete path sketched in privacy posture (**F.1** §3). |
| **J.7-c** | **Product UX** | “Save collection,” last-used account state, dashboard + completion views; **anonymous path unchanged** with soft CTA (“Save for next time”). |
| **J.7-d** | **Weekly plan v1** | Server-side cron or on-demand generation from saved missing + catalog; email later optional. |
| **J.7-e** | **OAuth** | **Phase B** providers (**Google**, later **Battle.net** per **`docs/auth-strategy.md`**). |
| **J.7-f** | **Premium gates** | Wire **`types/entitlements.ts`**; server enforcement for optimization / multi-character depth (**F.1** owns SKUs). |
| **J.7-g** | **Addon binary loop** | Coordinate with **J.6** + export contract v2 if needed. |

### Risks & mitigations (summary)

| Risk | Mitigation |
|------|------------|
| Users resist signup | **Anonymous-first** forever for core paste flow; auth is **opt-in** value (save, sync, weekly plan). |
| Friction | **OAuth** when ready; **auto-offer save** after successful paste. |
| Weak perceived value | After save, show **immediate** completion % + personalized top picks. |
| Scope creep | Ship **J.7-b + J.7-c** before **J.7-d**; treat **J.7.3** as a separate milestone. |

### Success metrics (when instrumented)

- % of sessions that **authenticate** (of those eligible)
- **Weekly** active authenticated users
- Sessions per user (anonymous vs authed)
- Premium **conversion** (if/when billing exists)
- Time on site / return rate

**Acceptance (epic-level)**

- **Done (MVP):** **`docs/j7-accounts.md`** documents flows for **J.7-a → J.7-c** + weekly slice (**J.7-d** on-demand, no email). **No** auth in **production** until **F.1** gates cleared intentionally.

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
| **1** | **J.* (pick one)** | **Phase I** clear; next bets are **J.2–J.7** or maintenance (**J.1** transmogs = post-launch / out of scope). |
| **—** | **J.2–J.6** | **J.2.1** planning → **`docs/adr-014-route-planner-mvp.md`**; implementation still open. **J.3–J.6** — larger bets; pick after **`docs/business-strategy.md`** gates if needed. (**J.6** = website → addon guide import / feedback loop.) |
| **—** | **J.7** | **Accounts + persistent collection + weekly loop** — large bet; **gated** on **F.1** §2 + aligns with **F.2**; see epic for phased plan (identity → collection API → UX → weekly plan → OAuth → premium → addon loop). |
| **✓** | **F.1** / **F.2** | **Shipped (strategy):** **`docs/business-strategy.md`**, **`docs/auth-strategy.md`**, **`types/entitlements.ts`**. |

**Do not implement auth Phase A or payments until** you intentionally clear the gates in **`docs/business-strategy.md`** §2. **Phase G** and **Phase H** are shipped.

---

*Scratch pad:* use GitHub issues or a one-line note here for **ad-hoc** ideas; **J.*** above is the promoted exploration queue.

---

*Completed epics: **`docs/backlog-archive.md`** (through **Phase I** + **J.2.1** route-planner planning in **ADR 014**). **Next:** **Phase J** implementation picks (**J.2** build or **J.3–J.7**); **J.1** transmogs deferred post-launch.*
