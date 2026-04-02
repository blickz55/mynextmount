import type { Mount } from "@/types/mount";
import type { RecommendationMode } from "@/types/recommendationMode";

function pickVariant(seed: number, lines: readonly string[]): string {
  if (lines.length === 0) return "";
  const i = Math.abs(seed) % lines.length;
  return lines[i]!;
}

/**
 * One-line “why farm this” copy. Uses optional `farmTip` from merged
 * `data/farm-tips.json`, then category + score-shape with per-id variation
 * so top lists are not identical.
 */
export function buildRecommendationReason(
  mount: Mount,
  mode: RecommendationMode,
): string {
  if (mount.retailObtainable === false) {
    return pickVariant(mount.id, [
      "We mark this as gone from Retail — check Wowhead before you spend time on it.",
      "Not gettable in Retail on our list — old tips may be wrong.",
    ]);
  }

  const tip = mount.farmTip?.trim();
  if (tip) return tip;

  const id = mount.id;
  const cat = (mount.sourceCategory || "").toLowerCase().trim();

  if (mode === "efficient" || mode === "balanced") {
    if (cat === "petstore") {
      return pickVariant(id, [
        "Shop mount — no raid lockout; grab it on sale or in a bundle.",
        "Real money / balance checkout — easy path if your wallet’s fine with it.",
        "Compare full price vs a promo before you click buy.",
      ]);
    }
    if (cat === "promotion") {
      return pickVariant(id, [
        "Promo mount — watch Blizz campaigns; sometimes comes back for anniversaries.",
        "Easy when the promo’s live, impossible between windows.",
      ]);
    }
    if (cat === "tradingpost") {
      return pickVariant(id, [
        "Trading Post — farm Tender, wait for it to hit the rotation.",
        "Monthly stock — save up and snap it when it’s listed.",
      ]);
    }
    if (cat === "vendor") {
      return pickVariant(id, [
        "Buy from an NPC — gold or tokens, usually predictable.",
        "Vendor grind — Wowhead has the who and where.",
      ]);
    }
    if (cat === "quest") {
      return pickVariant(id, [
        "Quest chain — longer setup than clicking shop, no weekly loot dice.",
        "One-and-done story payoff if you like guided stuff.",
      ]);
    }
    if (cat === "achievement") {
      return pickVariant(id, [
        "Achievement checklist — finish it once, mount’s yours.",
        "Takes skill or time, but the end is guaranteed.",
      ]);
    }
    if (cat === "profession") {
      return pickVariant(id, [
        "Craft it — farm mats or buy them, no raid lockout.",
        "Usually pricey on the AH, but you pick the pace.",
      ]);
    }
    if (cat === "discovery") {
      return pickVariant(id, [
        "Secret-style — follow a guide once, then it’s on your account.",
        "Weird puzzle hunt up front, fixed reward at the end.",
      ]);
    }
    if (cat === "worldevent") {
      return pickVariant(id, [
        "Holiday window — easy if you hit dailies during the event.",
        "Seasonal boss or currency — set a calendar reminder.",
      ]);
    }
    if (cat === "tcg") {
      return pickVariant(id, [
        "TCG / old codes — check legit sources and BMAH.",
        "Rare in the wild — more about supply and gold than boss skill.",
      ]);
    }

    const quick = mount.timeToComplete <= 30;
    const comfyDrop = mount.dropRate >= 0.04;
    const easyFight = mount.difficulty <= 2;

    if (comfyDrop && quick) {
      return pickVariant(id, [
        "Decent drop odds and a short run — good “one more try” material.",
        "Friendly RNG + quick trip — squeeze runs between other stuff.",
      ]);
    }
    if (comfyDrop) {
      return pickVariant(id, [
        "Nice drop odds; run’s longer but still worth repeating.",
        "RNG’s on your side — keep showing up.",
      ]);
    }
    if (easyFight && quick) {
      return pickVariant(id, [
        "Chill fight, short route — easy to spam.",
        "Low stress farm when you don’t want a raid slog.",
      ]);
    }
    if (easyFight) {
      return pickVariant(id, [
        "Easy boss; just pace yourself on travel time.",
        "Light mechanics — consistency beats gear checks.",
      ]);
    }
    if (mount.lockout === "weekly") {
      return pickVariant(id, [
        "Weekly lock — still worth a calendar slot when the odds and time fit.",
        "Once a week pin; plan around reset.",
      ]);
    }
    if (mode === "efficient") {
      return pickVariant(id, [
        "Solid farm pick — drop rate, run length, and tries per week line up well.",
        "Good bang-for-buck among drops and vendors.",
      ]);
    }
    return pickVariant(id, [
      "Middle ground — not pure speed-farm, not pure trophy chase.",
      "Balanced pick when you want something sensible.",
    ]);
  }

  const isRareTag = mount.tags.includes("rare");
  const veryLowDrop = mount.dropRate < 0.015;
  const hard = mount.difficulty >= 4;

  if (cat === "petstore" || cat === "promotion") {
    return pickVariant(id, [
      "Not really a farm — rarity is money and timing, not boss RNG.",
      "Bragging rights here are wallet / promo luck, not drop luck.",
    ]);
  }

  if (isRareTag && veryLowDrop) {
    return pickVariant(id, [
      "Big RNG energy — rare tag + stingy drop; pack patience.",
      "Prestige territory — expect a long campaign.",
    ]);
  }
  if (isRareTag && hard) {
    return pickVariant(id, [
      "Hard content + rare flag — double pain, double flex if it drops.",
      "Skill check meets mean loot — celebrate if it ever procs.",
    ]);
  }
  if (isRareTag) {
    return pickVariant(id, [
      "Marked rare — stands out from collection filler.",
      "Either nasty odds or low supply — people remember this one.",
    ]);
  }
  if (veryLowDrop) {
    return pickVariant(id, [
      "Brutal drop rate — think months, not afternoons.",
      "Lottery boss — bring podcasts and friends.",
    ]);
  }
  if (hard) {
    return pickVariant(id, [
      "Tough content + rough odds — flex mount if you land it.",
      "Wipes and repair bills count toward the real cost.",
    ]);
  }
  return pickVariant(id, [
    "Scores high on scarcity — good when you want something uncommon.",
    "Rarest-first mode likes this one — trophy hunting.",
  ]);
}
