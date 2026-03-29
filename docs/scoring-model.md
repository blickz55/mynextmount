# Mount scoring model — composite engine & economics framing

This document reverse-engineers the **legacy** heuristics, describes the **composite** replacement used by the tool UI, and records **statistics**, **sensitivity**, and **tradeoffs**.

---

## 1. Legacy system (preserved for regression & parity)

### Easiest — `lib/scoreEasiest.ts`

Higher score = modeled “easier to obtain”.

**Formula**

\[
S_{\text{easy}} = 0.5\left(1-\frac{d}{5}\right) + 0.3\,p + 0.2\cdot\frac{1}{\max(T,1)}
\]

| Symbol | Source | Notes |
|--------|--------|--------|
| \(d\) | `difficulty` | 1–5 |
| \(p\) | `dropRate` | Heuristic 0–1 (not always literal drop %) |
| \(T\) | `timeToComplete` | Minutes per attempt / run |

**Properties**

- **Linear, static weights** — no personalization.
- **No explicit lockout** — weekly bosses are not modeled separately from \(T\).
- **\(1/T\) term** — unbounded sensitivity as \(T\to 1^{+}\) (mitigated by `max(T,1)`).
- **Redundancy** — \(p\) and \(d\) both proxy “how painful is RNG / content” for many mounts.

### Rarest — `lib/scoreRarest.ts`

Higher score = “rarer / harder trophy”.

**Formula**

\[
S_{\text{rare}} = 0.6(1-p) + 0.2\frac{d}{5} + 0.2\cdot\mathbb{1}_{\text{rare tag}}
\]

**Implementation note:** The numeric result is delegated to `scoreRarestDetailed` → `PROFILE_LEGACY_RAREST` on the composite engine so **breakdown strings** stay consistent.

---

## 2. Weaknesses (legacy & early composite)

| Issue | Easiest | Rarest |
|-------|---------|--------|
| **Ultra-rare drops** | Low \(p\) dominates linear term only weakly (0.3 weight); difficulty can outweigh. | Intentionally favors them — OK for “prestige” mode. |
| **Trivial farms** | High \(p\) + low \(T\) can cluster many mounts at similar scores → **ties / flat ranking**. | N/A. |
| **Sensitivity** | \(1/T\) steep for short \(T\). | Mostly linear in \(p\); stable under small \(p\) jitter unless near ties. |
| **Redundancy** | Difficulty vs drop vs time overlap conceptually. | `rare` tag correlates with low \(p\) in data. |
| **Personalization** | None — same function for every user. | None. |

---

## 3. Composite model (tool: Efficient & Balanced)

All **factor components** are in \([0,1]\) before weighting. Weights are **configurable** in `lib/scoring/profiles.ts` (and can be passed to `scoreMountComposite` for experiments).

### Factor definitions — `lib/scoring/factors.ts`

| Key | Meaning |
|-----|---------|
| `easeFromDifficulty` | \(1 - d/5\) |
| `dropLogProspect` | \(\log_{10}\) of \(p\) stretched between floor and 1 — **high** when odds are forgiving |
| `dropLinear` / `dropScarcity` | \(p\) and \(1-p\) (clamped) |
| `timeEfficiency` | Short \(T\) → high (log-compressed vs `TIME_CAP_MIN`) |
| `difficultyIntensity` | \(d/5\) |
| `rareTagBonus` | 1 if `tags` contains `rare` |
| `lockoutFlex` | `attemptsPerWeek(lockout) / 42` (cap 1) — **soft** model: `none`≈42, `daily` 7, `weekly` 1 |
| `accessibility` | Table lookup on `sourceCategory` (vendor/quest/shop/…) |
| `prestige` | Blend of log-scarcity, difficulty, rare tag (for **Balanced**) |
| `evThroughput` | \(1-\exp\!\left(-\frac{p\cdot \text{apw}}{\text{scale}\cdot \max(h_{\text{run}},0.08)}\right)\) with \(h_{\text{run}}=T/60\) — **EV-style proxy**, not a full simulation |
| `progressProximity` | Neutral **0.5** until account progress exists (Epic **J.7**) |

### Default weights

| Profile | Intent | Weights (sum 1) |
|---------|--------|------------------|
| **Efficient** (`efficient`) | Maximize **throughput / EV spirit** | `evThroughput` **0.55**, `timeEfficiency` 0.17, `lockoutFlex` 0.18, `easeFromDifficulty` 0.05, `accessibility` 0.05 |
| **Balanced** (`balanced`) | Mix odds, time, lockout, friction, prestige | Spread across 7 factors — see `PROFILE_BALANCED` |
| **Rarest prestige** (`rarest`) | Same as legacy rare | `dropScarcity` 0.6, `difficultyIntensity` 0.2, `rareTagBonus` 0.2 |

---

## 4. Economic framing (conceptual)

**Target intuition (not literal in-game EV):**

\[
\text{EV}_{\text{proxy}} \propto \frac{p \cdot U \cdot \text{attempts/week}}{\max(h_{\text{run}},\epsilon)}
\]

- **Cost:** \(h_{\text{run}}\) from `timeToComplete`, lockout via `attemptsPerWeek`.
- **Utility \(U\):** folded into mode weights (Efficient ≈ \(U\) flat; Rarest ≈ trophy utility).
- **Diminishing returns / fatigue:** not modeled in v1 (extension: decay term or session cap).
- **Opportunity cost:** not multi-mount joint optimization (extension: **J.2** route planner).

The squashing `1 - exp(-raw/scale)` keeps scores **bounded** and **cheap** for real-time sorting.

---

## 5. Statistical comparison (offline)

Run:

```bash
npm run scoring:compare
```

Output: `data/build/scoring-model-compare.json` — Spearman \(\rho\) between **legacy easiest** vs **efficient/balanced** on a **stratified sample** (~320 mounts), plus **largest rank deltas**.

**Example snapshot (Retail catalog, sample step 4):**

- \(\rho(\text{legacy easy}, \text{efficient}) \approx 0.999\)
- \(\rho(\text{efficient}, \text{balanced}) \approx 0.9999\)

**Interpretation:** Global ordering is **highly correlated** with legacy easiest (low disruption), while individual mounts can still move **dozens of ranks** when EV/lockout disagree with the old \(1/T\) mix (see `topRankDeltasLegacyVsEfficient` in the JSON).

---

## 6. Sensitivity analysis

The compare script perturbs `dropRate` (+8%) and `timeToComplete` (×1.2) and measures mean absolute rank movement among the **top 40** by legacy easiest. On recent samples, **ordering often stayed identical** (mean delta 0) because score gaps in the head of the list exceeded the linear perturbation — **not** a proof of global insensitivity.

**Guidance:** When tuning weights, re-run `npm run scoring:compare` and spot-check mounts whose **category** or **lockout** changed in data pipeline updates.

---

## 7. Personalization (modes)

| UI mode | Engine | Role |
|---------|--------|------|
| **Efficient (EV-style)** | `efficient` | Emphasize `evThroughput`, time, lockout |
| **Balanced** | `balanced` | Blend prestige + accessibility + EV |
| **Rarest prestige** | `rarest` | Legacy rare formula (explainable via same factors) |

**Shipped:** `completionByExpansion` remains optional; **Epic K.4** adds **`personalization`** on the same `ScoringContext` (attempt pressure, weekly reset urgency, lockout demotion).

---

## 8. K.4 personalization (signed-in farm list)

After the baseline **`scoreForRecommendationMode`** result (efficient / balanced / rarest), we apply **`applyK4PersonalizationToScore`** when `ctx.personalization` is set:

| Signal | Effect |
|--------|--------|
| **Farm attempts** (per spell) | Small additive boost with **\(1 - e^{-a/\tau}\)** (diminishing returns; \(\tau \approx 9\)). |
| **Locked** (daily/weekly, from K.3 row) | Score multiplied by a **small constant** (~0.018) so the mount sinks in the list. |
| **Weekly + available** | Additive boost scaling with **\(1 - \Delta t / 7\text{d}\)** where \(\Delta t\) is time until **`nextWeeklyResetAt`** — stronger as the weekly reset approaches. |

**Constants** live in **`lib/scoring/k4Personalization.ts`** (tunable).

**Coverage cap:** `/tool` only loads farm-row data for the first **500** mounts in the **baseline** sort; mounts beyond that keep **neutral** personalization until filters narrow the list.

**Epic K.6 (same `ScoringContext.personalization`):** optional **`behavior`** (`preferShortRunsStrength`, `raidAvoidanceStrength`) from local engagement / deprioritize — see **`lib/scoring/k6BehaviorPersonalization.ts`** and **`docs/j7-accounts.md`** (Epic K.6).

**Epic K.8 (after K.4 + K.6):** optional **`communityBoostBySpellId`** — small additive deltas from **`MountListingCommunityAggregate`** / listing helpfulness sums. Implementation: **`lib/scoring/k8CommunityRecommendation.ts`** (`recommendationBoostFromPersistedAggregate`, **`getCommunityRecommendationBoost`**). Loaded with **`POST /api/collection/farm-attempts`** on **`/tool`** and on the server save path via **`buildServerFarmScoringPersonalization`**. UI copy for votes stays **“helpful listing”**; ranking use is downstream only.

---

## 9. Explainability

`scoreForRecommendationMode` returns:

- `score` — final weighted sum (for rarest, same as legacy numeric).
- `factors` — full \([0,1]\) vector.
- `weighted` — non-zero `weight × factor` terms.
- `reasons` — top weighted contributors as short strings.

The farm list UI exposes a **collapsible “Score”** block per mount.

---

## 10. Tradeoffs & extensions

| Tradeoff | Choice |
|----------|--------|
| **Realism vs simplicity** | Proxy EV, not drop-table Monte Carlo. |
| **Stability vs responsiveness** | Log/squash factors reduce cliff edges vs raw \(1/T\). |
| **Extension hooks** | New keys in `FactorVector` + weights; optional `ScoringContext`; gold/hour & routing as new factors later. |

**Performance:** One pass per mount: \(O(1)\) arithmetic — suitable for full-catalog sort client-side.

---

## Related code

- `lib/scoring/*` — factors, profiles, composite, Spearman helper
- `lib/scoreEasiest.ts` — legacy easiest (tests & reference)
- `lib/scoreRarest.ts` — thin wrapper over `scoreRarestDetailed`
- `lib/selectTopMountsByScore.ts` — sort helper
- `scripts/scoring-model-compare.ts` — offline stats
- `lib/farmSessionPlan.ts` — Epic **K.5** session builder (uses ranked farm list order)
- `lib/farmPreferenceModel.ts`, `lib/farmPreferenceStorage.ts`, `lib/scoring/k6BehaviorPersonalization.ts` — Epic **K.6**
- `lib/scoring/k8CommunityRecommendation.ts`, `lib/loadCommunityRecommendationBoostMap.ts`, `lib/refreshMountListingCommunityAggregate.ts` — Epic **K.8**
- `tests/scoring-composite.test.ts`, `tests/scoring-stats.test.ts`, `tests/k4-personalization.test.ts`, `tests/k6-behavior-personalization.test.ts`, `tests/k8-community-recommendation.test.ts`, `tests/farm-preference-model.test.ts`, `tests/farm-session-plan.test.ts`
