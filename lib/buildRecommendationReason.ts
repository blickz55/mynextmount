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
      "Not obtainable in current Retail — legacy or removed source; verify on Wowhead before planning.",
      "Curated as unobtainable in Retail — do not treat vendor or drop metadata as current.",
    ]);
  }

  const tip = mount.farmTip?.trim();
  if (tip) return tip;

  const id = mount.id;
  const cat = (mount.sourceCategory || "").toLowerCase().trim();

  if (mode === "efficient" || mode === "balanced") {
    if (cat === "petstore") {
      return pickVariant(id, [
        "Shop mount — no raid lockout; buy when it’s on sale or in a bundle.",
        "Battle.net / in-game Shop: checkout-only, so it ranks high on ease if you’re fine spending.",
        "Straight purchase path — compare full price vs promotional balance before you click buy.",
      ]);
    }
    if (cat === "promotion") {
      return pickVariant(id, [
        "Promo mount — watch Blizzard’s campaigns; often returns during cross-promos or anniversaries.",
        "Limited-time offer pattern: easiest when the promotion is live, impossible between windows.",
      ]);
    }
    if (cat === "tradingpost") {
      return pickVariant(id, [
        "Trading Post Tender item — no boss RNG; grind currency and wait for the rotation.",
        "Monthly shop stock — save Tender and snap it when the mount is listed.",
      ]);
    }
    if (cat === "vendor") {
      return pickVariant(id, [
        "Vendor purchase or currency grind — predictable compared to pure drop luck.",
        "Gold or token sink at an NPC — Wowhead lists the exact vendor and coordinates.",
      ]);
    }
    if (cat === "quest") {
      return pickVariant(id, [
        "Quest chain reward — longer setup than a shop click but no weekly loot dice.",
        "One-time storyline payoff — good if you like guided content over farm loops.",
      ]);
    }
    if (cat === "achievement") {
      return pickVariant(id, [
        "Achievement gated — work through the checklist once, then the mount is guaranteed.",
        "Skill or time achievement — harder than a shop mount but still deterministic at the end.",
      ]);
    }
    if (cat === "profession") {
      return pickVariant(id, [
        "Profession craft — farm mats or buy them, then craft without raid lockouts.",
        "Crafted sink — usually expensive on AH but you control the timeline.",
      ]);
    }
    if (cat === "discovery") {
      return pickVariant(id, [
        "Secret-style unlock — follow a guide once; after that it’s on your account.",
        "Puzzle or hidden objective — front-loaded research, then usually a fixed reward.",
      ]);
    }
    if (cat === "worldevent") {
      return pickVariant(id, [
        "Holiday event mount — easy during the two-week window if you plan dailies.",
        "Seasonal currency or boss — mark your calendar so you don’t miss the year’s window.",
      ]);
    }
    if (cat === "tcg") {
      return pickVariant(id, [
        "TCG / legacy redemption — check current legitimate codes and BMAH / promotions.",
        "Rare tag in data: supply is limited, so “easy” is about wallet, not boss difficulty.",
      ]);
    }

    const quick = mount.timeToComplete <= 30;
    const comfyDrop = mount.dropRate >= 0.04;
    const easyFight = mount.difficulty <= 2;

    if (comfyDrop && quick) {
      return pickVariant(id, [
        "High modeled drop odds and a short time cost — strong “next attempt” pick.",
        "Data says comfy drop + quick run — good for squeezing tries between other content.",
      ]);
    }
    if (comfyDrop) {
      return pickVariant(id, [
        "Strong drop odds; longer run but still efficient over time.",
        "Favorable RNG profile — worth repeating if you can spare the session length.",
      ]);
    }
    if (easyFight && quick) {
      return pickVariant(id, [
        "Low difficulty, short clear — low friction to spam attempts.",
        "Chill fight + snappy route — nice when you don’t want a raid slog.",
      ]);
    }
    if (easyFight) {
      return pickVariant(id, [
        "Approachable fight; pace yourself on the longer route.",
        "Mechanics-light relative to other farms — focus on consistency over gear checks.",
      ]);
    }
    if (mount.lockout === "weekly") {
      return pickVariant(id, [
        "Weekly lockout — still worth a calendar slot when the model likes your odds and time cost.",
        "Once per week pin; efficient/balanced modes factor attempts-per-week into the ranking.",
      ]);
    }
    if (mode === "efficient") {
      return pickVariant(id, [
        "High EV-style throughput in the current model — good odds and time/lockout tradeoff.",
        "Favors mounts where modeled drop rate, run length, and weekly tries line up well.",
      ]);
    }
    return pickVariant(id, [
      "Balanced composite — mixes odds, time, lockouts, source friction, and a touch of prestige.",
      "Middle-of-road pick when you want neither pure speed-farming nor pure trophy chasing.",
    ]);
  }

  const isRareTag = mount.tags.includes("rare");
  const veryLowDrop = mount.dropRate < 0.015;
  const hard = mount.difficulty >= 4;

  if (cat === "petstore" || cat === "promotion") {
    return pickVariant(id, [
      "Not really a “farm” — scarcity is about availability and money, not boss RNG.",
      "Rarity here is supply / shop timing, not a drop table — different bragging rights.",
    ]);
  }

  if (isRareTag && veryLowDrop) {
    return pickVariant(id, [
      "Marquee RNG: rare tag plus a very low modeled drop — expect a long campaign.",
      "Prestige mount territory — community war stories match the harsh odds.",
    ]);
  }
  if (isRareTag && hard) {
    return pickVariant(id, [
      "Hard content + rare flag — double sting if you’re chasing prestige.",
      "Boss skill check meets stingy loot — celebrate hard if it ever procs.",
    ]);
  }
  if (isRareTag) {
    return pickVariant(id, [
      "Flagged rare in the dataset — stands out from everyday collection fillers.",
      "Tagged rare: either real low supply or brutal odds in player memory.",
    ]);
  }
  if (veryLowDrop) {
    return pickVariant(id, [
      "Very low modeled drop — a long-haul commitment, mentally budget months not days.",
      "Lottery-style odds — pair with podcasts and friends so burns out slower.",
    ]);
  }
  if (hard) {
    return pickVariant(id, [
      "Harder content with rough drop math — flex mount if you land it.",
      "Mechanics and tuning matter; wipe recovery time is part of the real cost.",
    ]);
  }
  return pickVariant(id, [
    "Scores high on scarcity — a strong pick when you want something uncommon.",
    "Weighted toward rarity in this mode — good when you’re bored of easy checks.",
  ]);
}
