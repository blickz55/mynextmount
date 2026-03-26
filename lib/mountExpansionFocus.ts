/**
 * PARKED for product UI (2025-03): dataset `expansion` is still "Unknown" for almost all mounts.
 * Kept for future `/tool` + addon era filters once `data:build` or overrides populate real labels.
 * Tests: tests/mount-expansion-focus.test.ts
 */
import type { Mount } from "@/types/mount";

/** `all` = no era filter; `unknown` = mounts with missing/unrecognized expansion labels. */
export type ExpansionFocusId =
  | "all"
  | "classic"
  | "tbc"
  | "wrath"
  | "cata"
  | "mop"
  | "wod"
  | "legion"
  | "bfa"
  | "shadowlands"
  | "dragonflight"
  | "the_war_within"
  | "unknown";

export type ExpansionFocusOption = {
  id: ExpansionFocusId;
  label: string;
  /** Hook for compass-ring segment color in CSS */
  eraToken: string;
};

const ERA_ROWS: readonly {
  id: Exclude<ExpansionFocusId, "all" | "unknown">;
  synonyms: readonly string[];
}[] = [
  {
    id: "classic",
    synonyms: ["Classic", "Vanilla", "Classic Era", "Era Classic"],
  },
  {
    id: "tbc",
    synonyms: ["The Burning Crusade", "Burning Crusade", "TBC", "BC"],
  },
  {
    id: "wrath",
    synonyms: [
      "Wrath of the Lich King",
      "WotLK",
      "Wrath",
      "Lich King",
      "WOTLK",
    ],
  },
  { id: "cata", synonyms: ["Cataclysm", "Cata"] },
  {
    id: "mop",
    synonyms: ["Mists of Pandaria", "Mists", "MoP", "Pandaria"],
  },
  {
    id: "wod",
    synonyms: ["Warlords of Draenor", "Warlords", "WoD", "Draenor"],
  },
  { id: "legion", synonyms: ["Legion"] },
  {
    id: "bfa",
    synonyms: ["Battle for Azeroth", "BfA", "BFA", "Battle For Azeroth"],
  },
  {
    id: "shadowlands",
    synonyms: ["Shadowlands", "SL"],
  },
  {
    id: "dragonflight",
    synonyms: ["Dragonflight", "Dragon Flight", "DF"],
  },
  {
    id: "the_war_within",
    synonyms: ["The War Within", "War Within", "TWW"],
  },
];

/** Dropdown order: all → chronological → unknown bucket */
export const EXPANSION_FOCUS_OPTIONS: readonly ExpansionFocusOption[] = [
  { id: "all", label: "All eras — full hunt", eraToken: "all" },
  { id: "classic", label: "Classic / Vanilla", eraToken: "classic" },
  { id: "tbc", label: "The Burning Crusade", eraToken: "tbc" },
  { id: "wrath", label: "Wrath of the Lich King", eraToken: "wrath" },
  { id: "cata", label: "Cataclysm", eraToken: "cata" },
  { id: "mop", label: "Mists of Pandaria", eraToken: "mop" },
  { id: "wod", label: "Warlords of Draenor", eraToken: "wod" },
  { id: "legion", label: "Legion", eraToken: "legion" },
  { id: "bfa", label: "Battle for Azeroth", eraToken: "bfa" },
  { id: "shadowlands", label: "Shadowlands", eraToken: "shadowlands" },
  { id: "dragonflight", label: "Dragonflight", eraToken: "dragonflight" },
  { id: "the_war_within", label: "The War Within", eraToken: "the_war_within" },
  {
    id: "unknown",
    label: "Unknown era (unlabeled in data)",
    eraToken: "unknown",
  },
];

export function normalizeExpansionLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ");
}

/**
 * Map a mount's `expansion` string to a focus id. Unrecognized or empty → `unknown`.
 */
export function mountExpansionFocusId(mount: Mount): ExpansionFocusId {
  const raw = (mount.expansion ?? "").trim();
  const n = normalizeExpansionLabel(raw);
  if (!raw || n === "unknown" || n === "?" || n === "—" || n === "-") {
    return "unknown";
  }
  for (const row of ERA_ROWS) {
    for (const syn of row.synonyms) {
      if (normalizeExpansionLabel(syn) === n) return row.id;
    }
  }
  return "unknown";
}

export function mountMatchesExpansionFocus(
  mount: Mount,
  focus: ExpansionFocusId,
): boolean {
  if (focus === "all") return true;
  return mountExpansionFocusId(mount) === focus;
}

export function expansionFocusLabel(focus: ExpansionFocusId): string {
  const row = EXPANSION_FOCUS_OPTIONS.find((o) => o.id === focus);
  return row?.label ?? focus;
}
