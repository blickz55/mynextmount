/**
 * Plan / entitlement scaffold for future accounts & billing (Epic F.2).
 * Server-side code must be authoritative when auth ships; this module is for shared typing only.
 */

export type PlanId = "free" | "premium";

export type Entitlements = Readonly<{
  plan: PlanId;
}>;

/** Paste-only anonymous sessions today — maps to free-tier capabilities. */
export const ANONYMOUS_ENTITLEMENTS: Entitlements = Object.freeze({
  plan: "free",
});

/** Signed-in users without billing — same capabilities as anonymous until premium SKUs ship (F.1). */
export const AUTHENTICATED_FREE_ENTITLEMENTS: Entitlements = Object.freeze({
  plan: "free",
});
