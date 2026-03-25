# Authentication & accounts strategy (Epic F.2)

This document satisfies **backlog.md — Epic F.2** acceptance: **technical + policy runway** for moving from anonymous paste-only toward **accounts**, **optional OAuth**, and **subscription-ready entitlements**, **without** implementing Phase A login in this epic.

**Status:** Strategy only. The live site remains **local-first** and **paste-only** until an explicit future epic implements Phase A.

**Commercial posture (what is sold, when):** **`docs/business-strategy.md`** (Epic **F.1**).

---

## Principles

| Topic | Decision |
|--------|----------|
| **MVP today** | No accounts required; export string stays in memory / client unless the user chooses otherwise later. |
| **PII** | Collect the **minimum** needed for auth and billing; no “social graph” or friend lists. |
| **Secrets** | **Never** embed API client secrets or session signing keys in client bundles. OAuth **client secret** and password hashes live **only** on the server (or managed auth provider). |
| **Data pipeline** | Account-linked export retention, deletion, and logging must stay consistent with **`docs/data-harvesting.md`** and any future privacy policy. |
| **SKUs / pricing** | **`docs/business-strategy.md`** (F.1) owns *what* is sold and *when*; this doc defines *how* the stack can support tiers. |

---

## Phased authentication (F.2.1)

### Phase A (future) — Email or username + password

- **Password storage:** Modern slow hash (**Argon2id** preferred; **bcrypt** acceptable with per-password salt and work factor policy).
- **Sessions:** Server-side session store or signed **httpOnly**, **Secure**, **SameSite** cookies; **CSRF** protection for state-changing routes.
- **Abuse:** Rate limits on login and registration; generic error messages to reduce account enumeration.
- **Transport:** HTTPS only in production.

### Phase B (post-launch) — OIDC / OAuth2 (optional)

Supported **candidates** for “Sign in with …” on the same user record:

| Provider | Role |
|----------|------|
| **Google** | Broad adoption; standard OIDC. |
| **Apple** | Expected on Apple-heavy audiences; follow Apple’s Sign in with Apple guidelines. |
| **Battle.net (Blizzard)** | Strong fit for WoW players; **must** follow current Blizzard developer rules (below). |

**Identity linking:** One internal `user_id` with one or more `identities` rows `(provider, provider_subject)`. **Merge strategy** (document before launch): e.g. verified email match with explicit user confirmation, or “hard” separate accounts until support intervenes — pick one and enforce in product copy.

### Non-goals (v1 of auth)

- No social graph, public profiles, or follower model.
- No “login required” for the core paste → recommend flow until product intentionally gates it.

---

## Battle.net OAuth (Phase B) — portal alignment

**Authoritative references** (URLs may be reorganized by Blizzard; always verify in the live portal):

- **Developer hub:** [Battle.net Community Developer Portal](https://develop.battle.net/)
- **OAuth guides:** [Using OAuth](https://develop.battle.net/documentation/guides/using-oauth) (includes flows such as [Authorization Code Flow](https://develop.battle.net/documentation/guides/using-oauth/authorization-code-flow))
- **Legal / ToU:** [Legal documentation](https://develop.battle.net/documentation/guides/legal)
- **Sample code:** [Blizzard/oauth-client-sample](https://github.com/Blizzard/oauth-client-sample) (official patterns; adapt to your stack)

**Implementation expectations (high level):**

1. **Register** an OAuth client in the portal; configure **redirect URIs** exactly (HTTPS, no wildcards unless the portal allows documented patterns).
2. Use the **authorization code** flow with a **confidential** server exchanging the code (recommended for Next.js: server route or backend — **do not** put the client secret in the browser).
3. Send **access tokens** to Blizzard APIs using the **`Authorization: Bearer <token>`** header per current portal guidance (Blizzard has been moving away from passing tokens in query strings).
4. **Regions:** Use the **region** and hostnames documented in the current guide (e.g. China and global endpoints differ); do not hardcode undocumented URLs without re-checking the portal.
5. **Scopes:** Request only scopes needed for your feature (e.g. identity / profile); re-read the portal when adding scopes.

Before shipping Battle.net login, re-verify **redirect URI limits**, **rate limits**, and **token lifetime** in the live documentation.

---

## Entitlements & feature flags (F.2.2)

- **Source of truth:** When accounts exist, **`plan`** and feature flags are determined on the **server** (or billing webhook), not from client-only JSON.
- **Client:** May receive a **signed** or **opaque** capability summary for UI gating; treat as **hints** only — enforce limits on the server for anything that matters.
- **Code scaffold:** See **`types/entitlements.ts`** — `PlanId` and `Entitlements` for future use; today the anonymous experience maps to **`free`**.

**World of Warcraft addon (paid features):**

- The **in-game addon** must stay within **Blizzard’s addon guidelines** (no paywalled gameplay inside the addon).
- **Website** may gate **data, views, sync, or convenience** tied to a subscription; the addon remains export / display aligned with those rules.

---

## Standard vs. premium (options — F.2.3)

Exact SKUs and launch timing are **business** decisions under **`docs/business-strategy.md`** (F.1). Technical envelope:

| Area | Standard (free) | Premium (examples) |
|------|-----------------|---------------------|
| Core recommender | Paste export, filters, scroll, rarest block, Wowhead links | Same or higher caps / convenience |
| Digests / tips | Community summaries as shipped | Faster refresh, more coverage, or editor-curated bundles |
| Guides | Static checklist + source link | Video/route packs, lockout planner (if built) |
| Accounts | Optional anonymous | Saved exports, history, sync across devices |
| Support / ops | Best-effort | Priority, custom thresholds |

---

## Checklist before implementing Phase A

- [ ] **`docs/business-strategy.md`** §2 gates cleared (or explicitly waived in writing) so initial **`plan`** semantics match what you ship (even if everything stays free at launch).
- [ ] Privacy: data retention / deletion documented for **stored exports** and **session** metadata.
- [ ] Threat model skim: session fixation, CSRF, rate limits, OAuth state/nonce, open redirects.
- [ ] Re-read **`docs/data-harvesting.md`** for any new server logs or PII from auth.

---

## Revision

| Date | Change |
|------|--------|
| *(initial)* | Epic F.2 strategy doc + `types/entitlements.ts` scaffold. |
