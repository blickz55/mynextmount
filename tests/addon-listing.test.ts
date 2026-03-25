import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("addonListing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.NEXT_PUBLIC_ADDON_LISTING_URL;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getAddonListingUrl defaults to CurseForge search", async () => {
    const { getAddonListingUrl } = await import("@/lib/addonListing");
    expect(getAddonListingUrl()).toBe(
      "https://www.curseforge.com/wow/addons/search?search=MyNextMount",
    );
  });

  it("getAddonListingUrl trims env value", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_ADDON_LISTING_URL",
      "  https://www.curseforge.com/wow/addons/mynextmount  ",
    );
    const { getAddonListingUrl } = await import("@/lib/addonListing");
    expect(getAddonListingUrl()).toBe(
      "https://www.curseforge.com/wow/addons/mynextmount",
    );
  });

  it("hasCustomAddonListingUrl is false when unset or whitespace", async () => {
    const { hasCustomAddonListingUrl } = await import("@/lib/addonListing");
    expect(hasCustomAddonListingUrl()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_ADDON_LISTING_URL", "   ");
    vi.resetModules();
    const { hasCustomAddonListingUrl: again } = await import(
      "@/lib/addonListing"
    );
    expect(again()).toBe(false);
  });

  it("hasCustomAddonListingUrl is true when env is non-empty", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_ADDON_LISTING_URL",
      "https://addons.wago.io/addons/mynextmount",
    );
    const { hasCustomAddonListingUrl } = await import("@/lib/addonListing");
    expect(hasCustomAddonListingUrl()).toBe(true);
  });
});
