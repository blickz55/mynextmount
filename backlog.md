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

### Backlog (not started)

- **I.8 — Recommendation mode tooltips** — Add **“What’s this?”** (or similar) hover affordances next to **Mode** on **`/tool`**. Use the existing **OpenAI** integration with a **detailed, structured prompt** to draft accurate, concise explanations for **Efficient (EV-style)**, **Balanced**, and **Rarest prestige**; human-review, then wire copy into tooltips. *Do not implement until prioritized.*

- **I.9 — Spike: faction-aware filtering (Horde / Alliance)** — Investigate whether Retail mount data + player context support **reliable faction-based filtering** (e.g. vendor/quest mounts that are Horde- or Alliance-only) without breaking the **ownership invariant**. Deliverable: short doc with **data sources** (journal APIs, `mounts.json` fields, Wowhead), **edge cases** (neutral, allied races, legacy), and a **go / no-go** for product scope.

- **I.10 — Brand icon parity (site favicon + addon)** — Replace the **generic dragon** favicon with **MNM-branded** artwork; ensure the **in-game addon** uses the **same** asset (TOC **`IconTexture`**, minimap button, any future UI) so recognition matches the site. Coordinate with **`NEXT_PUBLIC_FAVICON_URL`** / build-time favicon pipeline.

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

**Structured stories & acceptance criteria** for snapshots, attempts, lockouts, scoring UX, and related depth: **Phase K** below (implements and extends **J.7-b+**, overlaps **J.2** / **`docs/adr-014-route-planner-mvp.md`** where noted).

---

# PHASE K — Personal progression & intelligence (planned)

**Status:** **K.1–K.8 shipped** (community-weighted ranking + prior K work).

**Intent:** Persist **history** and **behavior** (snapshots, attempts, lockout signals) on top of today’s **`collectionSpellIds`** + **`lib/mountFarmEligibility`**, **`lib/scoring`**, and existing **community votes** (**`MountListingVote`**). Priorities: **P0** = **K.1**, **K.2**; **P1** = **K.3**, **K.4**; **P2** = **K.5**–**K.8**.

**Phase K — Decisions (locked for v1 implementation)**

| Topic | Decision |
|--------|----------|
| **K.2 Attempt scope** | Increment **only** mounts in the **ranked farm list** at save time (same mode + source filters as `/tool`), **capped at top 50** IDs. **Not** every eligible unowned mount. See **K.2.1.1** rationale. |
| **K.3 Weekly reset** | **v1:** User picks **one** reset calendar on account (default **Americas & Oceania**). **EU** optional. Times in **UTC** below. **Future:** finer region if needed. |
| **K.1 Empty export** | **v1:** **`ok: true`** but **empty `ids`** → **no snapshot** on normal save (avoids junk history). **Later:** if **“Clear collection”** ships, allow an explicit empty snapshot / audit event. |
| **K.8 Community** | **v1:** Use **`sum(MountListingVote.value)`** exposed as **`listingHelpfulnessScore`**. **Future-proofing:** see **K.8.1.1** (store raw parts, version the signal, keep scoring behind a thin adapter). |

---

## Epic K.1 — Historical snapshots (P0)

**Goal:** Persist mount collection states over time for progress tracking, diffing, and future intelligence.

**Shipped:** `MountCollectionSnapshot`, `PUT /api/collection` snapshot + diff payload, `GET /api/collection/snapshots`, toolbar copy — see **`docs/j7-accounts.md`** (Epic K.1).

### Feature K.1.1 — Snapshot persistence

#### Story K.1.1.1 — Save snapshot on collection update

**Acceptance criteria**

- When a user submits a **valid parsed export** (signed-in flow using persisted collection):
  - A **new snapshot record** is created.
  - Snapshot includes **`userId`**, **full list of mount spell IDs**, **timestamp**.
  - Snapshot is stored **independently** (does **not** overwrite prior snapshots).
  - **`collectionSpellIds`** may remain for quick access; **snapshots** are the **source of truth for history**.
- **Duplicate uploads:** if payload is **identical** to the most recent snapshot → either **skip** creation **or** create and **mark as duplicate** (implementation choice — document in API or **`docs/j7-accounts.md`**).

#### Story K.1.1.2 — Snapshot retrieval

**Acceptance criteria**

- System can fetch: **most recent** snapshot, **previous** snapshot, and **all** snapshots (for future features).
- Results sorted by **timestamp descending**.
- Query performance stays within a **&lt;200ms** target for a **typical** user’s snapshot count (define “typical” in implementation notes; paginate if needed).

### Feature K.1.2 — Snapshot diffing

#### Story K.1.2.1 — Compute delta between snapshots

**Acceptance criteria**

- Given two snapshots, system returns **`mountsAdded[]`** and **`mountsRemoved[]`** (spell ID sets).
- Diff is **spell-ID** based.
- Handles **first snapshot** (no previous → no diff or empty delta — specify behavior).
- Handles **empty** collections.

#### Story K.1.2.2 — Expose diff to UI layer

**Acceptance criteria**

- Diff available to **`/tool`** (or account) **state** after successful save.
- UI can render **count of new mounts** and **names** (resolve via existing **`mounts`** / **`Mount`** dataset).

### Feature K.1.3 — Snapshot integrity

#### Story K.1.3.1 — Data validation

**Acceptance criteria**

- Snapshot creation **only** when parse result is **`ok: true`**.
- **v1 — Normal save:** if the parsed **`ids`** array is **empty**, **do not** create a snapshot (no meaningless history row). **Invalid** exports (**`ok: false`**) never create snapshots.
- **Future — Explicit clear:** if product adds **“Clear my collection”**, allow a **documented** empty snapshot or audit record (out of scope until that flow exists).

---

## Epic K.2 — Attempt tracking (P0)

**Goal:** Track how many times a user has attempted to farm a mount (per spell ID).

**Shipped:** `MountFarmAttempt`, `PUT /api/collection` farm bump + **`farmAttempts`** payload, `POST /api/collection/farm-attempts`, **`lib/topFarmTargetsForSave`**, **`CollectionToolbar`** save context, farm list UI — see **`docs/j7-accounts.md`** (Epic K.2).

### Feature K.2.1 — Attempt recording

#### Story K.2.1.1 — Increment attempts on upload

**Product rationale:** Users interpret **“attempts”** as *“how often I’ve gone after mounts I’m actually chasing,”* not *“every mount I don’t own.”* Incrementing **all** eligible unowned mounts on each paste **inflates numbers**, breaks trust, and reads like a bug. **Modern heuristic:** attribute intent only to mounts the product is **actively recommending** in context (ranked list + cap), consistent with **progressive disclosure** and **feedback clarity**.

**Acceptance criteria**

- On **successful** collection save (same trigger family as snapshots; signed-in):
  - Build the **same ranked farm list** the tool would show for that user’s **missing** mounts: **current recommendation mode**, **current source filters**, existing **`lib/mountFarmEligibility`** (or successor), same sort/score pipeline as **`/tool`**.
  - Take the **top 50** spell IDs from that ranking (constant **`K_ATTEMPT_INCREMENT_CAP`**, document in code + **`docs/j7-accounts.md`** or sibling).
  - For **each** of those IDs only: increment **`userId` + `spellId`** attempt counter (**+1** per save event subject to **K.2.3** anti-spam).
- **UX:** Short explainer near attempt UI (tooltip or footnote): attempts reflect **top suggestions at save time**, not your **entire** missing catalog.

#### Story K.2.1.2 — First-time attempt initialization

**Acceptance criteria**

- If no row exists: create with **`attempts = 1`**, **`lastAttemptAt = now`**.

#### Story K.2.1.3 — Update existing attempts

**Acceptance criteria**

- If row exists: **`attempts += 1`**, **`lastAttemptAt`** updated.

### Feature K.2.2 — Attempt visibility

#### Story K.2.2.1 — Surface attempts in UI

**Acceptance criteria**

- Each **recommended** mount row can show **attempt count**.
- **v1:** Show **0** when the user has **no** stored attempts for that mount (clearer than hiding; avoids “did this load?” confusion). **Optional later:** hide label entirely when **0** if visual noise becomes an issue.

#### Story K.2.2.2 — Attempt-based probability hint

**Acceptance criteria**

- System can compute **probability of having seen the drop at least once** from **`dropRate`** (catalog) + **`attempts`**; output **percentage (rounded)**.
- Display is **optional** but **supported** in data/API for UI.

### Feature K.2.3 — Attempt accuracy safeguards

#### Story K.2.3.1 — Prevent inflation from spam uploads

**Acceptance criteria**

- Detect **rapid duplicate** submissions (e.g. **&lt;5 minutes**, same or near-identical export).
- Either **ignore increment** for that window **or** **cap** increments per window (document choice).

---

## Epic K.3 — Lockout state tracking (P1)

**Goal:** Track whether a mount is **currently farmable** or **locked** (daily / weekly), aligned with catalog **`lockout`** field.

**Shipped:** `MountLockoutCompletion`, `User.weeklyResetCalendar`, `PUT /api/collection` lockout upserts, `POST /api/collection/farm-attempts` **`lockout`** payload, `PATCH /api/account`, **`/account`** calendar UI, farm row **Available** / **Locked** — see **`docs/j7-accounts.md`** (Epic K.3).

### Feature K.3.1 — Lockout persistence

#### Story K.3.1.1 — Record lockout completion

**Acceptance criteria**

- On export submit, for mounts with **`lockout`** **`weekly`** or **`daily`** (from catalog): record **“attempted this cycle”** with **`lastCompletedAt`** per **`userId` + `spellId`** (or equivalent model).

### Feature K.3.2 — Lockout calculation

#### Story K.3.2.1 — Determine availability

**Acceptance criteria**

- Per mount: compute **Available** vs **Locked** from **`lockout`**, **`lastCompletedAt`**, **current time**.

#### Story K.3.2.2 — Reset logic

**Acceptance criteria**

- **Daily:** mount becomes available again after **24 hours** from **`lastCompletedAt`** (document timezone: **UTC** storage; display local where relevant).
- **Weekly — v1 (user-chosen calendar, default Americas/Oceania):**
  - **Americas & Oceania (default):** boundary = **Tuesday 15:00 UTC** (aligns with **8:00 AM Pacific** for US maintenance window; PDT/PST seasonal offset is player-local display only).
  - **Europe:** boundary = **Wednesday 04:00 UTC** (aligns with **~5:00 AM CET / ~4:00 AM** in common EU display interpretations — document exact strings in UI copy).
- Account stores **`weeklyResetCalendar`** enum: **`americas_oceania`** | **`europe`** (default **`americas_oceania`** until user changes it). **Future:** optional Battle.net region linkage; finer splits only if data supports them.
- **Future optional:** region-aware resets beyond this **two-calendar** model (see **ADR 014**).

### Feature K.3.3 — UI representation

#### Story K.3.3.1 — Display lock state

**Acceptance criteria**

- Farm / recommendation rows can show **Available**, **Locked**, and **time until reset** when locked.

---

## Epic K.4 — Scoring enhancements (P1)

**Goal:** Extend **existing** scoring (**`lib/scoring`**, modes **`efficient` / `balanced` / `rarest`**) — not replace it.

**Shipped:** **`ScoringContext.personalization`**, **`lib/scoring/k4Personalization.ts`**, `/tool` re-rank + farm card scores when signed in, **`POST /api/collection/farm-attempts`** **`nextWeeklyResetAt`**, **`PUT /api/collection`** top-50 targets use same personalized order — see **`docs/scoring-model.md`** §10.

### Feature K.4.1 — Attempt pressure factor

#### Story K.4.1.1 — Integrate attempt-based weighting

**Acceptance criteria**

- Scoring pipeline takes **attempt count** as input.
- **Higher attempts → higher priority** with **non-linear** / **diminishing-returns** scaling (tunable).

### Feature K.4.2 — Lockout urgency factor

#### Story K.4.2.1 — Prioritize expiring opportunities

**Acceptance criteria**

- **Weekly** mounts: score **boost** as **reset approaches** (define curve).
- **Locked** mounts: **reduced** or **zero** contribution to “farm next” ordering as appropriate.

### Feature K.4.3 — Backward compatibility

#### Story K.4.3.1 — Preserve existing modes

**Acceptance criteria**

- Modes **efficient**, **balanced**, **rarest** keep current baseline behavior; new factors are **additive** and **non-breaking** (feature-flag or documented weight **0** off-state if needed).

---

## Epic K.5 — Session planning (P2)

**Goal:** Turn recommendations into **actionable play sessions** (routing). Complements **J.2** / **ADR 014**; may share heuristics.

**Shipped:** **`lib/farmSessionPlan.ts`** (group by expansion + `location`, greedy budget fill), **`FarmSessionPlanPanel`** on **`/tool`** with **30 / 45 / 60** min presets — see **`docs/j7-accounts.md`** (Epic K.5).

### Feature K.5.1 — Route grouping

#### Story K.5.1.1 — Group mounts by location

**Acceptance criteria**

- Recommended mounts grouped by **expansion** and/or **zone** (`location` / catalog fields).
- Each group: **mount list** + **estimated total time** (reuse **`timeToComplete`** heuristics where possible).

### Feature K.5.2 — Session builder

#### Story K.5.2.1 — Generate session plan

**Acceptance criteria**

- Produce a **session** object: **subset of mounts**, **total estimated time**, respecting a **configurable** time budget (e.g. **30–60 min**).

### Feature K.5.3 — UI display

#### Story K.5.3.1 — Present session plan

**Acceptance criteria**

- UI shows **grouped route**, **total time**, visually distinct from the **flat** farm list.

---

## Epic K.6 — Personalization (P2)

**Goal:** Adapt recommendations from **observed** behavior.

**Shipped:** **`localStorage`** (`mnm-farm-prefs-v1`), opening **Score** (once/mount/UTC day) + **Show less like this** on farm rows, **`deriveFarmBehaviorSignals`**, **`applyK6BehaviorPersonalizationToScore`** after K.4 — see **`docs/j7-accounts.md`** (Epic K.6).

### Feature K.6.1 — Preference capture

#### Story K.6.1.1 — Infer preferences

**Acceptance criteria**

- Track **skipped** mounts and **clicked** / engaged mounts; derive **signals** (e.g. preference for short runs).

### Feature K.6.2 — Preference application

#### Story K.6.2.1 — Modify scoring

**Acceptance criteria**

- Preferences adjust **scoring weights** (e.g. **reduce raid** tilt if user consistently avoids raid-tagged targets).

---

## Epic K.7 — Progress & feedback UX (P2) ✅

**Goal:** Make **progress** visible and motivating.

### Feature K.7.1 — Progress summary ✅

#### Story K.7.1.1 — Display collection progress ✅

**Acceptance criteria**

- Show **total owned**, **total obtainable** (define obtainable vs catalog + **retailObtainable**), **% complete**.
- **Shipped:** **`lib/collectionProgressStats.ts`** — **`computeCollectionProgressStats`** (obtainable = **`retailObtainable !== false`**). **`/account`** saved-export stats + **`/tool`** **`collection-progress-k7`** panel after paste.

### Feature K.7.2 — Delta feedback ✅

#### Story K.7.2.1 — Show gains ✅

**Acceptance criteria**

- After upload: show **mounts gained since last snapshot** (ties to **K.1**).
- **Shipped:** **`PUT /api/collection`** **`snapshot.diff.added`** drives **`components/CollectionToolbar.tsx`** **`collection-toolbar__gains`** list (names, up to 12 + “and N more”) plus status line.

---

## Epic K.8 — Community signal integration (P2) ✅

**Goal:** Use **existing** community feedback to nudge recommendations.

### Feature K.8.1 — Score aggregation ✅

#### Story K.8.1.1 — Compute community score ✅

**Acceptance criteria**

- Per mount, maintain a **versioned** aggregate used only for recommendation tuning (naming avoids painting votes as objective “quality”):
  - **v1 field:** **`listingHelpfulnessScore`** = **`sum(value)`** over **`MountListingVote`** rows for that **`spellId`**.
  - **Persist raw ingredients** alongside the scalar where practical: e.g. **`voteCount`**, **`sumValues`** (so **v2** can switch to **Wilson / Bayesian / time-decayed** sums **without** losing raw counts).
  - **`communitySignalSchemaVersion`** (or equivalent) on the aggregate object or materialized row so migrations are explicit.
- **Scoring integration** reads community influence through a **single adapter** (e.g. **`getCommunityRecommendationBoost(spellId)`**) so **K.8.2** can swap implementations without touching the composite scorer graph.
- **Shipped:** **`MountListingCommunityAggregate`** (Prisma) + migration backfill from **`MountListingVote`**; **`refreshMountListingCommunityAggregate`** on **`POST /api/mounts/[spellId]/vote`**; **`recommendationBoostFromPersistedAggregate`** + **`getCommunityRecommendationBoost`** in **`lib/scoring/k8CommunityRecommendation.ts`**; batch map via **`loadCommunityRecommendationBoostMap`**.

### Feature K.8.2 — Scoring integration ✅

#### Story K.8.2.1 — Apply community weighting ✅

**Acceptance criteria**

- **Higher** **`listingHelpfulnessScore`** (and/or adapter output) → **modest** recommendation boost; **lower** → **reduced** priority; tunable and **additive** to **K.4**.
- **Future:** New signals (**`farmQualityScore`**, decayed votes) plug in via the same adapter; **do not** overload **`MountListingVote`** semantics in UI copy (votes remain **“helpful listing”**; recommendation use is **downstream**).
- **Shipped:** **`applyK8CommunityBoostToScore`** after K.4 + K.6 in **`scoreForRecommendationMode`**; **`communityBoostBySpellId`** on **`POST /api/collection/farm-attempts`** and in **`buildServerFarmScoringPersonalization`** (save-path re-rank). Constants **`K8_COMMUNITY_TANH_SCALE`**, **`K8_COMMUNITY_BOOST_MAX`**.

---

## Parked — expansion era filter (website + addon)

**Why parked:** Harvested **`mounts.json`** still has **`expansion: "Unknown"`** (almost) everywhere, so a web or in-game “farm by era” control does not deliver real value until the pipeline fills labels.

**Keep in repo for pickup:**

- **`lib/mountExpansionFocus.ts`** (+ **`tests/mount-expansion-focus.test.ts`**) — canonical era buckets and synonym matching.
- **`scripts/generate-addon-expansion.mjs`** — **`npm run addon:sync-expansion`** (was used to emit addon expansion map; not loaded by the addon while parked).
- Inspect Blizzard mount JSON keys anytime: **`npm run data:inspect-mount-sample`**.

**When un-parking:** Wire **`/tool`** UI + styles again; re-add optional addon files + TOC lines; run **`addon:sync-expansion`** after **`data:build`** / overrides populate **`expansion`**.

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
| **—** | **K.1 → K.2 (P0)** | **Snapshots + diffs** then **attempt tracking** — foundation for progress UX, anti-spam, and later **K.3–K.8**; depends on stable **J.7** persistence. |
| **—** | **K.3 → K.4 (P1)** | **Lockout state** + **scoring enhancements** after attempts/snapshots exist. |
| **—** | **K.5 → K.8 (P2)** | **Sessions**, **personalization**, **progress UI**, **community-weighted** ranking. |
| **—** | **J.2–J.6** | **J.2.1** planning → **`docs/adr-014-route-planner-mvp.md`**; implementation still open. **J.3–J.6** — larger bets; pick after **`docs/business-strategy.md`** gates if needed. (**J.6** = website → addon guide import / feedback loop.) |
| **—** | **J.7** | **Accounts + persistent collection + weekly loop** — large bet; **gated** on **F.1** §2 + aligns with **F.2**; see epic for phased plan (identity → collection API → UX → weekly plan → OAuth → premium → addon loop). |
| **✓** | **F.1** / **F.2** | **Shipped (strategy):** **`docs/business-strategy.md`**, **`docs/auth-strategy.md`**, **`types/entitlements.ts`**. |

**Do not implement auth Phase A or payments until** you intentionally clear the gates in **`docs/business-strategy.md`** §2. **Phase G** and **Phase H** are shipped.

---

*Scratch pad:* use GitHub issues or a one-line note here for **ad-hoc** ideas; **J.*** above is the promoted exploration queue.

---

*Completed epics: **`docs/backlog-archive.md`** (through **Phase I** + **J.2.1** route-planner planning in **ADR 014**). **Next:** **Phase J** implementation picks (**J.2** build or **J.3–J.7**); **Phase K** when **J.7** persistence is the active track; **J.1** transmogs deferred post-launch.*
