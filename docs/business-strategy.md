# Business & monetization clarity (Epic F.1)

This document satisfies **backlog.md — Epic F.1**: **what could be sold**, **compliance re-checks** before taking money, **privacy posture**, and **explicit gates** tying commercial work to **stability** and **data surface completeness (D.6)**.

**Not legal advice.** Have counsel review before binding terms, payments, or public “premium” promises.

**Related:** **`docs/auth-strategy.md`** (F.2 — *how* accounts/OAuth/entitlements work technically). This doc owns **whether and when** commercial features are in play.

---

## 1. What we sell — current decision

| Horizon | Offering | Notes |
|---------|----------|--------|
| **Today** | **Nothing ( $0 )** | **MyNextMount** is a **free**, **local-first** paste tool + static dataset. No checkout, no subscription, no paywalled site features. |
| **Optional near-term** | **Donations** (e.g. Ko-fi / GitHub Sponsors) | Still “not selling product” — if enabled, describe as **support**, not a SKU. Does not unlock in-app entitlements unless a **separate** decision + build ships. |
| **Future (not committed)** | **Premium tier(s)** | Candidates only — see **§5**. Require **F.1 gates** (below) + **`docs/auth-strategy.md`** Phase A/B before any **entitlement-gated** feature ships. |

**Marketing honesty:** Until **§3.2** is satisfied, do **not** claim **“complete”** mount data, full digest coverage, or parity with the journal — align with **`CONTRIBUTING.md`** (pre-commercial honesty) and **`docs/data-harvesting.md`** (*Pre-commercial completeness*).

---

## 2. Gates before monetization or “premium” messaging

Monetization stories (payments, subscription copy, paywalled features) stay **off** until **all** of the following are true.

### 2.1 — Personal-use stability (milestone)

Subjective but must be **explicitly checked off** by maintainers before commercial work:

- [ ] Core flow (**paste → parse → filter owned → score → list**) is reliable for real exports on **`/tool`**.
- [ ] **Ownership invariant** remains covered by tests (**`npm run test`** — Epic G.1).
- [ ] No **known sev-1** breakage (site down, data corruption, export misparsed) open on `main`.
- [ ] **Hosting** and **domain** story documented (**`docs/deployment.md`**).

*Amend this checklist in a PR when the bar moves.*

### 2.2 — Data surface completeness (Epic D.6)

- [ ] **`npm run data:check-surface -- --strict`** passes in CI (or release process) with **committed** **`SURFACE_*`** thresholds in **`.env.example`** / docs — see **`docs/data-harvesting.md`** → *Pre-commercial completeness (Epic D.6)*.
- [ ] **`data/build/surface-check-report.json`** (or CI artifact) reviewed for the release that enables money.
- [ ] **Digest / farm-tip / guide** percentages: if you **raise** strict thresholds above defaults, document why in a PR.

**Prerequisite note:** Epics **D.5** and **D.6** are **implemented** in code and docs. **F.1** means: before **charging**, you must actually **run** strict surface checks and agree the numbers match what you will claim in marketing.

### 2.3 — Wowhead / Tier 3 and D.5 digest pipeline

The repo allows **maintainer-run automation** for guides/digests/tips (see **`docs/data-harvesting.md`** — *Maintainer override*, **`.cursorrules`**). That does **not** remove third-party risk.

**Before taking money**, **re-read** and confirm still accurate:

- **`docs/data-harvesting.md`** — Tier 3 + maintainer override; Wowhead ToU still applies to **how you operate**.
- **`docs/wowhead-digests.md`** — digest provenance; automation is allowed **at operator risk**.
- **`CONTRIBUTING.md`** — digest + farm-tip workflows.

If you **monetize**, complete a **ToU / legal review** of **your actual** fetch/automation stack (not just the old “manual only” docs).

### 2.4 — Blizzard & addon rules

Before any paid feature (even website-only):

- [ ] **`docs/adr-012-addon-strategy.md`** — addon stays **export/display** aligned with Blizzard; **no** paywalled gameplay **inside** the addon.
- [ ] **[Battle.net / developer legal](https://develop.battle.net/documentation/guides/legal)** — OAuth/API use only as documented when you use Blizzard APIs for revenue-adjacent features.
- [ ] Re-check **[Wowhead Terms of Use](https://www.wowhead.com/terms-of-use)** (and any other Tier 3 sources you rely on) if monetization changes how you fetch or display their content.

---

## 3. Privacy & data (F.1.2)

| Today (paste-only) | Future (accounts / server) |
|--------------------|----------------------------|
| Export string is **in-browser** unless you add persistence. | Document **what** is stored (exports, emails, OAuth subjects), **retention**, **deletion**, and **logs** — extend **`docs/auth-strategy.md`** and this file. |
| No server-side storage required for MVP. | **Local-first** remains the default product philosophy until an intentional **sync** or **cloud save** epic ships. |

**Principle:** Minimize PII; no selling user data as a product; align retention with **`docs/data-harvesting.md`** when server logs touch harvest or user content.

---

## 4. Acceptance mapping (F.1)

| Requirement | Where addressed |
|-------------|-----------------|
| **F.1.1** — What is sold | **§1** (today: nothing; donations optional; future candidates **§5**) |
| **F.1.1** — Addon + Wowhead/data re-check | **§2.3**, **§2.4** |
| **F.1.1** — D.6 / D.5 prerequisites | **§2.2**, **§2.3** (D.5 ToU posture) |
| **F.1.2** — Privacy | **§3** |
| **Acceptance** — Gated on stability + D.6 | **§2.1** + **§2.2** |

---

## 5. Future premium candidates (not SKUs)

Exact **SKUs**, **pricing**, and **feature flags** are **business decisions** deferred until **§2** is green. Technical envelope (from **F.2**) for planning only:

| Area | Free baseline | Premium examples |
|------|----------------|------------------|
| Recommender | Paste, filters, scroll, rarest block, links | Higher caps / convenience |
| Digests / tips | As shipped | Faster refresh, more coverage, curated bundles |
| Guides | Checklist + source link | Video packs, lockout planner |
| Accounts | Anonymous paste | Saved exports, history, sync |
| Support | Best-effort | Priority |

---

## Revision

| Date | Change |
|------|--------|
| *(initial)* | Epic F.1 — commercial posture, gates, privacy, compliance pointers. |
