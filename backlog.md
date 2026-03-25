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

## Epic F.2 — Identity, OAuth roadmap, and subscription-ready tiers (future)

**Goal:** Move from anonymous paste-only toward **accounts** that can support **subscriptions** and **sync** later, without blocking today’s local-first MVP.

### Requirement F.2.1 — Phased authentication

1. **Phase A (future):** **Home-grown** email (or username) + password — modern password hashing (e.g. Argon2/bcrypt), rate limits, CSRF-safe sessions, secure cookies, **no** secrets in client.
2. **Phase B (post-launch):** Optional **OIDC / OAuth2** sign-in: **Google**, **Apple**, **Battle.net** (Blizzard) — same user record, linked identities, merge strategy documented.
3. **Non-goals for v1 of auth:** No “social graph”; minimal PII; align retention with **`docs/data-harvesting.md`** when accounts land.

### Requirement F.2.2 — Monetization posture

- Architecture should allow **feature flags** or **entitlements** (e.g. `plan: "free" | "premium"`) so **standard vs. premium** can ship without a rewrite.
- **Addon rules:** Any paid web feature that touches the in-game addon must stay within **Blizzard addon guidelines** (no paywalled gameplay in the addon itself; website can gate **data/views**).

### Requirement F.2.3 — Standard vs. premium (options to decide later)

| Area | **Standard (free)** | **Premium (examples)** |
|------|---------------------|-------------------------|
| Core recommender | Paste export, filtered sorted list + scroll, rarest block, Wowhead links | Same or higher caps / convenience |
| Digests / tips | Community summaries as shipped | **Faster** refresh cadence, **more** mounts covered, or **editor-curated** bundles |
| Guides | Static checklist + source link | **Video/route packs**, **lockout planner** (if built) |
| Accounts | Optional anonymous | **Saved exports**, **history**, **sync across devices** |
| Support / ops | Best-effort | Priority, custom thresholds |

*Exact SKUs are a **business** decision under **Epic F.1**; F.2 is technical + policy runway.*

**Acceptance**

- ADR or short **`docs/auth-strategy.md`** before implementing Phase A; Battle.net OAuth documented against current Blizzard developer portal rules.

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

**Done (see archive):** **G.1** — Vitest regression tests (`npm run test`): parse, filter-owned invariant, scoring determinism, full sorted-list order + expected head; fixture **`fixtures/g1-mount-catalog.json`** + export **`M:100001,100002`**. CI runs tests before lint/build.

## Epic G.2 — Performance

### Requirement G.2.1

- Site remains fast with **full mount list** (virtualize long lists if needed — **View your mounts** grid first for huge exports; then farm list if needed).

---

# Parking lot (intentionally incomplete)

Promote into Phase D, G, or ops when ready. **Rough value order** (highest leverage first for a public launch):

1. **Official addon listing URL** — drop into How To when CurseForge/Wago is live (quick win, builds trust). **Hosting / www:** see **`docs/deployment.md`** (Vercel + `www.mynextmount.com`).
2. **G.2 — Virtualize “View your mounts”** — large collections already stress DOM; farm list is incremental load today.
3. **Accessibility audit** — keyboard, contrast, screen readers (overlaps historical D.7; worth a focused pass).
4. **Mobile-friendly layout** — phone next to keyboard while playing (partially overlaps D.8 responsive work).
5. **How To** polish — short screen recording, locale-specific WoW paths.
6. **Mount preview “picture”** beyond spell icon — e.g. journal 3D or official render if a legal API path exists (related: D.6 table).
7. Transmog-adjacent filters — **out of scope** unless promoted.
8. Weekly lockout planner / route optimizer across toons.
9. **Classic / Mists / era** split datasets vs one mega app.
10. i18n / non-English guide snippets.
11. Backup export format if Blizzard adds **official** collection export.

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
| **1** | **G.2** — Perf / virtualization | Next likely pain point after **D.10** for players with **very large** collections (**View your mounts** first). |
| **3** | **Parking: CurseForge URL** | No code epic — update How To + any hardcoded links when the listing exists. |
| **4** | **F.1** — Business clarity | **Before** auth or payments: decide what “premium” could mean and gate on D.6 / digest ToU. |
| **5** | **F.2** — Auth / tiers | Only after F.1 + **`docs/auth-strategy.md`**; still optional for a paste-only public site. |

**Do not start F.* until** you are intentionally moving past “personal tool that others can use for free.” Until then, **G.2** is the main product-quality track after **G.1** (shipped).

---

*Completed epics: **`docs/backlog-archive.md`** (through **D.10**, **G.1**). Last updated: **G.1** regression tests shipped.*
