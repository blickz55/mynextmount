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

**Done (see archive):** **F.2** — **`docs/auth-strategy.md`** (phased auth, Battle.net OAuth pointers to [develop.battle.net](https://develop.battle.net/), entitlements / addon rules, standard vs premium table) and **`types/entitlements.ts`** (`PlanId`, `ANONYMOUS_ENTITLEMENTS`). **No** login UI, sessions, or payments in this epic — implement **Phase A** only after F.1 + checklist in that doc.

---

## Epic F.1 — Business clarity

### Requirement F.1.1

- Define **what is sold** (e.g. premium curated routes, sync, ad-free, nothing — donation only).
- **Blizzard addon rules** + **Wowhead / data** usage re-checked before taking money.
- **Prerequisite:** **Epic D.6** (pre-commercial harvest completeness gate) **green** for agreed thresholds; **Epic D.5** digest pipeline **ToU-reviewed** if live-scraping or bulk third-party text is involved.

### Requirement F.1.2

- **Privacy**: if any server-side exists later, document data retention; default stays **local-first** until intentional change.

**Acceptance**

- Monetization stories are **explicitly gated** behind “personal use stable” milestone **and** documented **data surface completeness** (D.6).

---

# PHASE G — Quality, ops, and testing

**Done (see archive):** **G.1** — Vitest regression tests (`npm run test`): parse, filter-owned invariant, scoring determinism, full sorted-list order + expected head; fixture **`fixtures/g1-mount-catalog.json`** + export **`M:100001,100002`**. CI runs tests before lint/build. **G.2** — **View your mounts** uses **`@tanstack/react-virtual`** when the export has **≥48** mounts (windowed rows, 1- or 2-column like the CSS breakpoint); farm recommendations stay **batched infinite scroll** (no full list in DOM at once).

---

# PHASE H — Responsive UX & navigation

## Epic H.1 — Mobile-friendly optimization

**Goal:** The site feels intentional on phones and small tablets (many players use a browser next to the game).

### Requirement H.1.1 — Layout & interaction

- **Viewport & scaling:** Confirm sensible `viewport` / default zoom behavior; no accidental “desktop shrink” reliance.
- **Touch targets:** Primary controls (submit, mode radios, filter checkboxes, disclosure summaries, theme toggle) meet ~**44×44px** effective hit areas where feasible without breaking density.
- **Readable type & spacing:** Comfortable line length, font sizes, and vertical rhythm on **≤390px** width; avoid cramped filter grids and mount rows.
- **Scroll & overflow:** No horizontal scroll traps in main flows; long URLs / names wrap or truncate predictably.
- **Safe areas:** Respect **notch / home-indicator** safe zones for fixed or full-bleed UI if introduced later.

### Requirement H.1.2 — Verification

- Smoke-test **`/`** (coming soon) and **`/tool`** on a real device or DevTools device mode; fix regressions found in forms, results, and virtualized owned grid.

**Acceptance**

- Documented quick **mobile smoke checklist** (bullet list in PR or **`docs/`** one-pager) satisfied for a representative small phone width.

---

## Epic H.2 — Primary navigation (brand → home)

**Goal:** Obvious way to “start over” or leave the tool without using the browser back button.

### Requirement H.2.1 — Brand block as navigation

- The **site title** (**MyNextMount** / logo + title region) on **`/`** and **`/tool`** is a single **clickable** control (e.g. `<a>` or `Link`) to **`/`** (canonical **home** / coming-soon landing).
- **Accessible:** valid focus ring, `aria` only if needed (avoid redundant “link” noise); keyboard **Enter** activates.
- **Optional:** subtle hover/focus affordance consistent with existing fantasy chrome (no new design system).

### Requirement H.2.2 — Consistency

- Same behavior in **light / dark** and with or without **brand logo** from env.
- If the title is split for styling (e.g. **Next** accent span), the **whole** branded heading area remains one link unless a deliberate secondary action is documented.

**Acceptance**

- From **`/tool`**, one tap/click on the brand returns to **`/`**; from **`/`**, brand link may refresh home or no-op, but must not navigate away to a dead end.

---

# Parking lot (intentionally incomplete)

Promote into Phase D, G, or ops when ready. **Rough value order** (highest leverage first for a public launch):

1. **Official addon listing URL** — drop into How To when CurseForge/Wago is live (quick win, builds trust). **Hosting / www:** see **`docs/deployment.md`** (Vercel + `www.mynextmount.com`).
2. **Accessibility audit** — keyboard, contrast, screen readers (overlaps historical D.7 + **H.2** focus; worth a focused pass).
3. **How To** polish — short screen recording, locale-specific WoW paths.
4. **Mount preview “picture”** beyond spell icon — e.g. journal 3D or official render if a legal API path exists (related: D.6 table).
5. Transmog-adjacent filters — **out of scope** unless promoted.
6. Weekly lockout planner / route optimizer across toons.
7. **Classic / Mists / era** split datasets vs one mega app.
8. i18n / non-English guide snippets.
9. Backup export format if Blizzard adds **official** collection export.
10. **Optional:** window-virtualize farm result cards if infinite scroll batches ever feel heavy (G.2 chose batching first).

---

# Open questions (need your answers when possible)

1. **Target product**: Retail only, or Classic too? (Drives API and mount list.)
2. **Guide ownership**: Are *you* the only editor, or crowdsourced PRs?
3. **Hosting**: Stay local-only forever, or deploy publicly for others?
4. **Icon source**: OK with **self-hosted** extracted icons vs hotlinking — legal comfort level?

---

# Suggested execution order (prioritized)

| Priority | Epic / item | Why |
|----------|-------------|-----|
| **1** | **Parking: CurseForge URL** | No code epic — update How To + any hardcoded links when the listing exists. |
| **2** | **H.2** — Brand → **`/`** navigation | Fast “go home” / reset mental model; standard web pattern for public visitors. |
| **3** | **H.1** — Mobile optimization | Many users run the site beside WoW on a phone; complements prior D.8 responsive work. |
| **4** | **F.1** — Business clarity | **Before** implementing auth Phase A or payments: decide what “premium” could mean and gate on D.6 / digest ToU. |
| **5** | **F.2** — Auth / tiers | **Shipped (strategy):** **`docs/auth-strategy.md`** + **`types/entitlements.ts`**. Building login is a **separate future epic** after **F.1**. |

**Do not implement auth Phase A or payments until** you are intentionally moving past “personal tool that others can use for free” **and** **F.1** is far enough along. **Phase G** is shipped; **H.1** / **H.2** remain the main **UX** track; **F.2** doc work is done.

---

*Completed epics: **`docs/backlog-archive.md`** (through **D.10**, **G.1**, **G.2**, **F.2** strategy). Last updated: **F.2** — **`docs/auth-strategy.md`** + entitlements types.*
