import { describe, expect, it } from "vitest";
import { largerSpellIconCandidate } from "@/lib/mountPreviewLargeSrc";

describe("largerSpellIconCandidate", () => {
  it("upgrades Blizzard render path from /icons/56/ to /icons/128/", () => {
    expect(
      largerSpellIconCandidate(
        "https://render.worldofwarcraft.com/us/icons/56/foo.jpg",
      ),
    ).toBe("https://render.worldofwarcraft.com/us/icons/128/foo.jpg");
  });

  it("preserves query and hash on Blizzard URLs", () => {
    expect(
      largerSpellIconCandidate(
        "https://render.worldofwarcraft.com/eu/icons/56/bar.jpeg?v=1#x",
      ),
    ).toBe(
      "https://render.worldofwarcraft.com/eu/icons/128/bar.jpeg?v=1#x",
    );
  });

  it("bumps ZAM wow icon path from medium to large", () => {
    expect(
      largerSpellIconCandidate(
        "https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg",
      ),
    ).toBe(
      "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg",
    );
  });

  it("returns unchanged URL when no rule applies", () => {
    const u = "https://example.com/icon.png";
    expect(largerSpellIconCandidate(u)).toBe(u);
  });
});
