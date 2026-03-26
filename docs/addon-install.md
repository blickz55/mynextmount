# MyNextMount (WoW addon)

## What it does

Collects **every mount you have learned** on this account (as shown in the Mount Journal), builds the **`v1`** string `M:<spellId>,<spellId>,…` with **no spaces**, and opens a **fixed-size window** with a **scroll bar** so you can **Ctrl+A**, **Ctrl+C**, and paste into **mynextmount.com**. **Esc** or **Close** dismisses the window (drag the top strip to move it).

Slash commands:

- `/mountexport`
- `/mynextmount`

**Options panel (Epic A.3 + C.2):** **Esc** → **Options** → **AddOns** → **MyNextMount** — **Open export for website**, optional **website URL**, and **Open farm guide window** (see **Epic C.2** in `docs/guides.md`). Slash **`/mnguides`** (alias **`/mfguides`**) opens the same guide UI.

## Install (Retail)

1. Copy the folder **`addons/MyNextMount`** from this repo into your WoW **Retail** add-ons directory, so you have:

   `World of Warcraft\_retail_\Interface\AddOns\MyNextMount\MyNextMount.toc`

2. Restart WoW or `/reload`.
3. Enable **MyNextMount** on the AddOns list (check **Load out of date AddOns** if your patch is newer than the `## Interface` line in the `.toc`).
4. Log in, run `/mountexport`, copy the string from the popup, paste into the site.

## Public listing (website)

The site’s **How to** panel (**`/tool`**) and the **`/`** pitch link to one outbound URL for players who use CurseForge, Wago, Overwolf, etc.:

- **`NEXT_PUBLIC_ADDON_LISTING_URL`** — set at build time (Vercel **Environment Variables** or `.env.local`) to your **project** URL when it exists.
- If unset, **`getAddonListingUrl()`** in **`lib/addonListing.ts`** uses **CurseForge search** for `MyNextMount` so the link is never empty.

**Manual install** from git is always documented here (folder **`addons/MyNextMount`**) and linked from the same panels as **`ADDON_INSTALL_DOCS_URL`**.

**Optional demo video (Epic I.3):** set **`NEXT_PUBLIC_HOWTO_DEMO_URL`** at build time to a short walkthrough (YouTube, Loom, or any URL you control that allows embedding / outbound links per their ToS). The **`/tool`** How To panel shows **Watch a quick walkthrough** when this is set.

When you publish on CurseForge, add a CurseForge project ID line to **`MyNextMount.toc`** (e.g. `## X-Curse-Project-ID: 123456`) per [CurseForge’s packaging docs](https://docs.curseforge.com/docs/getting-started/adding-a-project/project-details) if you use their release flow.

## Upgrade from `MountFarmExport` (old folder name)

1. Exit WoW. Delete **`Interface\AddOns\MountFarmExport`** (the old folder).
2. Copy **`Interface\AddOns\MyNextMount`** from this repo.
3. **SavedVariables (optional):** rename  
   `WTF\Account\<account>\SavedVariables\MountFarmExport.lua` → **`MyNextMount.lua`**.  
   On first load, the addon merges **`MountFarmExportDB`** into **`MyNextMountDB`** and clears the legacy table. If you skip this step, you only lose prior optional URL / guide checkboxes / last export metadata.

## Notes

- **Spell IDs** match `docs/export-contract.md` and `mounts.json` `id` after Epic A.1.
- **Clipboard:** WoW does not reliably expose a secure “copy for me” API for arbitrary text; select-all + copy from the in-game edit box is the portable approach (**Ctrl+A** / **Ctrl+C** on Windows; **⌘A** / **⌘C** on Mac). The website How To panel spells this out for first-time players.
- **Very large collections:** The text lives in a **scrollable** area; if a future client truncates buffer length, we will need **export v2** (chunking) — see backlog.
- **Testing many overlaps with the website:** `docs/testing-with-your-collection.md` + `npm run data:merge-stubs` (stubs → `data/mounts.stubs.json`).

## Saved variables

Primary: **`MyNextMountDB`**. The **`.toc`** still declares **`MountFarmExportDB`** temporarily so a renamed **`MountFarmExport.lua`** SavedVariables file loads; the main script merges into **`MyNextMountDB`** and then clears legacy data when present.

`MyNextMountDB` stores:

- `lastExportTime` (Unix seconds) and `lastExportCount` from the last export.
- `websiteUrl` (optional) for the copy dialog.
- **`guideChecks`** (Epic C.2) — table **`guideChecks[spellId][stepIndex] = true`** for farm-guide checklist progress; **per account** (same file for all chars on that WoW account). Relog-safe.

## Strategy (12.0+)

See **`docs/adr-012-addon-strategy.md`** (ADR 012): how this addon fits Midnight / patch **12.x** constraints, clipboard assumptions, SavedVariables discipline, and **fallback** order if APIs or copy behavior regress.
