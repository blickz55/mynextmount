# MyNextMount (WoW addon)

## What it does

Collects **every mount you have learned** on this account (as shown in the Mount Journal), builds the **`v1`** string `M:<spellId>,<spellId>,…` with **no spaces**, and opens a **fixed-size window** with a **scroll bar** so you can **Ctrl+A**, **Ctrl+C**, and paste into **mynextmount.com**. **Esc** or **Close** dismisses the window (drag the top strip to move it).

Slash commands:

- `/mountexport`
- `/mynextmount`

**Options panel (Epic A.3 + C.2):** **Esc** → **Options** → **AddOns** → **MyNextMount** — **Open export for website**, optional **website URL**, and **Open farm guide window** (see **Epic C.2** in `docs/guides.md`). Slash **`/mfguides`** opens the same guide UI.

## Install (Retail)

1. Copy the folder `addons/MountFarmExport` from this repo into your WoW **Retail** add-ons directory, so you have:

   `World of Warcraft\_retail_\Interface\AddOns\MountFarmExport\MountFarmExport.toc`

   (The folder name stays **`MountFarmExport`** for compatibility; the in-game title is **MyNextMount**.)

2. Restart WoW or `/reload`.
3. Enable **MyNextMount** on the AddOns list (check **Load out of date AddOns** if your patch is newer than the `## Interface` line in the `.toc`).
4. Log in, run `/mountexport`, copy the string from the popup, paste into the site.

## Public listing (website)

The site’s **How to** panel (**`/tool`**) and the **`/`** pitch link to one outbound URL for players who use CurseForge, Wago, Overwolf, etc.:

- **`NEXT_PUBLIC_ADDON_LISTING_URL`** — set at build time (Vercel **Environment Variables** or `.env.local`) to your **project** URL when it exists.
- If unset, **`getAddonListingUrl()`** in **`lib/addonListing.ts`** uses **CurseForge search** for `MyNextMount` so the link is never empty.

**Manual install** from git is always documented here (folder **`addons/MountFarmExport`**) and linked from the same panels as **`ADDON_INSTALL_DOCS_URL`**.

When you publish on CurseForge, add a CurseForge project ID line to **`MountFarmExport.toc`** (e.g. `## X-Curse-Project-ID: 123456`) per [CurseForge’s packaging docs](https://docs.curseforge.com/docs/getting-started/adding-a-project/project-details) if you use their release flow.

## Notes

- **Spell IDs** match `docs/export-contract.md` and `mounts.json` `id` after Epic A.1.
- **Clipboard:** WoW does not reliably expose a secure “copy for me” API for arbitrary text; select-all + **Ctrl+C** from the in-game edit box is the portable approach.
- **Very large collections:** The text lives in a **scrollable** area; if a future client truncates buffer length, we will need **export v2** (chunking) — see backlog.
- **Testing many overlaps with the website:** `docs/testing-with-your-collection.md` + `npm run data:merge-stubs` (stubs → `data/mounts.stubs.json`).

## Saved variables

`MountFarmExportDB` stores:

- `lastExportTime` (Unix seconds) and `lastExportCount` from the last export.
- `websiteUrl` (optional) for the copy dialog.
- **`guideChecks`** (Epic C.2) — table **`guideChecks[spellId][stepIndex] = true`** for farm-guide checklist progress; **per account** (same file for all chars on that WoW account). Relog-safe.

## Strategy (12.0+)

See **`docs/adr-012-addon-strategy.md`** (ADR 012): how this addon fits Midnight / patch **12.x** constraints, clipboard assumptions, SavedVariables discipline, and **fallback** order if APIs or copy behavior regress.
