# Mount export string contract

## Version

**`v1`** (current). Website and addon MUST agree on version before changing rules.

**Dataset scope:** **Retail** mount catalog policy and harvest governance live in **`docs/data-harvesting.md`** (Epic B.0). Classic / other editions need an explicit contract appendix before sharing the same `M:` export.

---

## Canonical ID: mount summon spell ID

Each integer in the export is the **spell ID of the mount summon spell** — the same spell the player learns when the mount is added to the collection (what you cast from the Mount Journal to summon that mount).

### Why spell ID

- It is **unique per mount** in Retail for normal collection mounts.
- It matches **Wowhead `/spell=<id>`** pages for mounts.
- It can be read from the Mount Journal APIs in-game (see below).

### Relationship to other IDs

| ID type | Notes |
|--------|--------|
| **Mount Journal `mountID`** | Integer used by `C_MountJournal.GetMountInfoByID(mountID, ...)`. Not the same number as spell ID, but **paired 1:1** per mount. |
| **Game Data API `mount.id`** | Blizzard’s REST **mount** resource id; again **not** the same integer as spell ID. |
| **Spell ID (canonical)** | **This project’s `mounts.json` `id` and `M:` export use this.** |

Addons may iterate journal `mountID`s and must **emit spell IDs** (or we add a `v2` format — not done yet).

### Lua reference (Retail)

From a journal mount index, spell ID is available from journal APIs, e.g.:

```lua
local creatureName, spellID, _, _, _, _, _, _, _, _, isCollected, mountID =
    C_MountJournal.GetDisplayedMountInfo(displayIndex)
-- spellID is the canonical value for this contract when present.
```

Implementers should prefer **official API returns** on their target patch over hard-coded tables.

---

## Wire format (`v1`)

- **Prefix:** `M:` (ASCII `M` + ASCII colon `:`). Case-insensitive on input (`m:` accepted).
- **Body:** comma-separated **base-10** unsigned integers (spell IDs), no spaces required (whitespace around commas is trimmed per token).
- **Order:** unspecified; duplicates SHOULD NOT appear (website treats ownership as a set).
- **Empty collection:** `M:` with nothing after the colon → zero owned IDs (valid).

### Examples

```text
M:65645,59961,41256
m:44151
M:
```

### Invalid examples

```text
12,45,78          -- missing M:
M:12, abc, 78     -- non-numeric token
M:12,,45          -- empty token
```

---

## Endianness / encoding

- **UTF-8** text. A leading **UTF-8 BOM** may appear when pasting from some editors; parsers SHOULD strip `\uFEFF` before validation (website does).

---

## Ownership invariant

Any spell ID present in the export is **owned**. The website MUST NOT recommend that mount. Parsed IDs are a **set** for filtering.

**Website farm list search (Epic I.7):** On **`/tool`**, an all-digit query matches **`mounts.json`** **`id`** (the same summon spell ID as in **`M:`**).

---

## Sample line for manual QA (curated dataset)

With the current `data/mounts.json` (20 mounts), owning the first three mounts in the file:

```text
M:65645,59961,41256
```

Paste → **Find My Mounts** → those three must **not** appear in the top recommendations (they are filtered out).

---

## Official addon (Epic A.2)

**MyNextMount** — retail add-on source in-repo: **`addons/MyNextMount/`**. Install: **`docs/addon-install.md`**.

Slash: **`/mountexport`** (alias **`/mynextmount`**) — emits the same **`v1`** `M:` string (mount summon spell IDs, sorted ascending, no spaces).

**Era filter (optional):** the export window and **`/mnguides`** share a saved **Era** setting (`MyNextMountDB.expansionFocus`). It filters which collected spell IDs are included in `M:…` and which in-game farm guides appear, using the same expansion buckets as the website (`lib/mountExpansionFocus.ts`). Buckets are shipped in **`MyNextMountExpansionData.lua`** — regenerate with **`npm run addon:sync-expansion`** (also runs as part of **`npm run addon:sync-guides`**).

To align your **full** export with the site dataset for testing, see **`docs/testing-with-your-collection.md`** (`npm run data:merge-stubs` → **`data/mounts.stubs.json`**, merged at app load with **`data/mounts.json`**).

---

## Future: `v2` (not implemented)

Reserved for chunked exports, alternate ID types, or compression if Blizzard or clipboard limits require it. Must bump version in both addon and site.
