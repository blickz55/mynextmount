import type { Mount } from "@/types/mount";

/** Drives relic border / glow + a short hint for the LLM. */
export type MountLoreTheme =
  | "default"
  | "shadowlands"
  | "northrend"
  | "outland"
  | "dragonflight"
  | "kalimdor"
  | "pandaria"
  | "brokenIsles"
  | "zandalar"
  | "kulTiras"
  | "fel"
  | "arcane"
  | "life";

const THEME_ORDER: MountLoreTheme[] = [
  "shadowlands",
  "dragonflight",
  "northrend",
  "outland",
  "pandaria",
  "brokenIsles",
  "zandalar",
  "kulTiras",
  "kalimdor",
  "fel",
  "arcane",
  "life",
];

/** Heuristic: dataset often leaves `expansion` as "Unknown"; use name, source, location, tags. */
export function inferMountLoreTheme(m: Pick<Mount, "name" | "source" | "location" | "tags" | "expansion">): MountLoreTheme {
  const exp = (m.expansion || "").toLowerCase();
  if (exp.includes("shadowlands")) return "shadowlands";
  if (exp.includes("dragonflight")) return "dragonflight";
  if (exp.includes("wrath") || exp.includes("northrend")) return "northrend";
  if (exp.includes("burning crusade") || exp.includes("outland")) return "outland";
  if (exp.includes("pandaria") || exp.includes("mists")) return "pandaria";
  if (exp.includes("legion") || exp.includes("broken isles")) return "brokenIsles";
  if (exp.includes("battle for azeroth") || exp.includes("zandalar")) return "zandalar";
  if (exp.includes("kul tiras")) return "kulTiras";

  const hay = [m.name, m.source, m.location, ...(m.tags || [])]
    .join(" ")
    .toLowerCase();

  if (
    /shadowlands|maldraxxus|ardenweald|revendreth|bastion|the maw|zereth|korthia/.test(
      hay,
    )
  ) {
    return "shadowlands";
  }
  if (
    /dragon isles|dracthyr|waking shore|ohn'ahran|thaldraszus|azure span|valdrakken|dragonflight/.test(
      hay,
    )
  ) {
    return "dragonflight";
  }
  if (
    /northrend|icecrown|sholazar|zul'drak|borean|grizzly|storm peaks|wrath|lich king|scourge/.test(
      hay,
    )
  ) {
    return "northrend";
  }
  if (/outland|hellfire|nagrand|terokkar|shadowmoon|netherstorm|shattrath/.test(hay)) {
    return "outland";
  }
  if (/pandaria|kun-lai|jade forest|vale of eternal|timeless isle|mogu|sha/.test(hay)) {
    return "pandaria";
  }
  if (/suramar|broken isles|legion|argus|val'sharah|highmountain|stormheim|azsuna/.test(hay)) {
    return "brokenIsles";
  }
  if (/zuldazar|nazmir|voldun|zandalari|loa/.test(hay)) return "zandalar";
  if (/tiragarde|drustvar|stormsong|kul tiras|proudmoore/.test(hay)) {
    return "kulTiras";
  }
  if (
    /fel|legion|demon|infernal|mannoroth|burning legion|eredar|pit lord/.test(hay)
  ) {
    return "fel";
  }
  if (/arcane|kirin tor|blue dragon|nexus|ley|mana|malygos|kalecgos/.test(hay)) {
    return "arcane";
  }
  if (/life.?binder|emerald dream|cenarion|wildseed|ardenweald|grove/.test(hay)) {
    return "life";
  }
  if (/kalimdor|ashenvale|silithus|feralas|durotar|mulgore|barrens|ungoro/.test(hay)) {
    return "kalimdor";
  }

  return "default";
}

/** Rotate theme by spell id so similar mounts don't all read the same “angle.” */
export function loreThemeWithRotation(
  m: Pick<Mount, "name" | "source" | "location" | "tags" | "expansion">,
  spellId: number,
): MountLoreTheme {
  const base = inferMountLoreTheme(m);
  if (base !== "default") return base;
  const i = Math.abs(spellId) % THEME_ORDER.length;
  return THEME_ORDER[i] ?? "default";
}

export function themeHintForModel(theme: MountLoreTheme): string {
  const hints: Record<MountLoreTheme, string> = {
    default: "worn roads, old coin, rain on cobbles—anywhere on Azeroth",
    shadowlands: "death-magic, bone ash, oath-bound souls, cold that eats sound",
    northrend: "frost under nails, war banners frozen mid-flap, hopeless marches",
    outland: "torn sky, fel embers, dust that was once a world",
    dragonflight: "bronze winds, titan silence, scales catching impossible sun",
    kalimdor: "heat, kodo drums, centaur grassfires, ancient groves",
    pandaria: "mist, rice wine steam, buried grudges, temple bells",
    brokenIsles: "legion ink, desperate wards, surf against demon coral",
    zandalar: "jungle rot, drums, blood-oath gold, loa-shadow",
    kulTiras: "salt, witch-craft fog, ship-timber groaning",
    fel: "green flame that hums teeth, sulfur, chains that remember",
    arcane: "ozone, ink-sigils, libraries that breathe",
    life: "pollen, wet bark, heartbeats under hooves",
  };
  return hints[theme];
}
