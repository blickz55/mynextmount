# Mount spotlight & Wowhead digests (Epic D.5)

## What shows on the site

Expandable rows include **Quick steps** (or **Mount spotlight** when a **flavor** paragraph exists): up to **five** ultra-short acquisition bullets (from committed data), plus a **Wowhead** link to the **comments** tab — **item page** when `wowheadItemId` is mapped, otherwise spell page (see **[wowhead-item-comments.md](./wowhead-item-comments.md)**).

To drive **coverage for every mount** alongside written guides, use **`docs/guide-experience-roadmap.md`** and **`npm run data:guide-experience`**.

**Archivist hover lore (owned collection):** Longer Markdown “timeways” prose for **View Your Mounts** hovers is **not** generated at request time. Run **`npm run content:mount-hover-lore-batch`** (see **`.env.example`**) to fill **`data/mount-hover-lore.json`**; **`lib/mounts.ts`** merges it into **`Mount.mountHoverLore`**. Re-run with **`--only-missing --apply`** after **`data:build`** adds new spell ids.

## How this ties to `mounts.json` (no manual merge)

Digest copy is **not** copied into **`data/mounts.json`**. The app loads **`mounts.json`** and **`wowhead-comment-digests.json`** together and merges by spell id at runtime (**`lib/mounts.ts`** → **`mergeWowheadCommentDigest`**). If you ran **`content:mount-flavor-batch`** with **`--apply`**, **`data/wowhead-comment-digests.json`** is already updated; commit that file (and redeploy if needed). The optional build artifact **`data/build/mount-flavor-batch.json`** is only a batch snapshot — the live site uses the committed digest file.

**Wowhead links (item vs spell):** Outbound “comments” links use **`resolveWowheadCommentsLink`** (**`lib/wowheadCommentsUrl.ts`**). When **`wowheadItemId`** is set (from **`data/overrides/wowhead-item-by-spell.json`** or the mount row), the UI uses **`/item=…#comments`**; otherwise it falls back to the spell **`commentsUrl`** / **`wowheadUrl`**. Farm guide **`sourceUrl`** is rewritten the same way in **`mergeGuide`**. Digest bullets should not duplicate URLs; the LLM prompt and normalizer strip any stray Wowhead links.

## Data source

Committed text lives in **`data/wowhead-comment-digests.json`**, keyed by **summon spell id** (same as row **`id`** / export). Each entry may include:

- **`asOf`** — ISO date when the copy was last refreshed.
- **`flavor`** — optional short paragraph (vibe / why collectors care).
- **`lines`** — string array of acquisition bullets (up to **5** merged in **`lib/mounts.ts`**).

Merged at runtime into **`Mount.wowheadMountFlavor`**, **`Mount.wowheadCommentDigest`**, and **`wowheadCommentDigestAsOf`** (see **`types/mount.ts`**).

On-screen copy explains that text is **LLM-generated from your mount metadata** (or hand-edited) and should be verified in-game.

### Tier 1 — Fully manual

Edit **`flavor`** and/or **`lines`** in JSON yourself.

### Tier 2 — LLM from **comment excerpts** (optional legacy path)

If you have lawful short excerpts (e.g. manual copy from a browser), run **`npm run wowhead-digest:draft`** — see [Input format](#input-format-for-wowhead-digestdraft). The model paraphrases into **`lines`**.

### Tier 3 — OpenAI from **`mounts.json` only** (default maintainer path)

**`npm run content:mount-flavor-batch`** calls OpenAI (default **`gpt-5.4`** via **Responses API**) with a structured prompt: **≤5** bullets, **≤10 words each**, no flavor paragraph; uses **only** fields from **`data/mounts.json`** (plus merged item id for context). The model may apply accurate Retail knowledge when the row is vague. **No Wowhead scraping.**

Flags: **`--limit=N`** (**`0`** = no cap; default **`10`** for normal runs only), **`--offset=N`** (skip first N rows after filters; not used with **`--spell-id`** / **`--spell-ids`** / **`--spell-ids-file`**), **`--only-missing`**, **`--spell-id=N`**, **`--spell-ids=1,2,3`** (comma-separated — list **every** id; do not use **`...`**), **`--spell-ids-file=data/build/mount-flavor-failed-spell-ids.txt`**, **`--flavor-force`**, **`--dry-run`**, **`--apply`**, **`--delay-ms=`**.

Writes **`data/build/mount-flavor-batch.json`**; with **`--apply`**, merges into **`data/wowhead-comment-digests.json`** after **each** successful mount (so long runs are not lost on crash). Provenance: **`data/mount-flavor-provenance.json`** (still appended once at the end of the run).

Prefer accurate, cautious phrasing; do not commit verbatim third-party comment dumps.

## Input format for `wowhead-digest:draft`

JSON file:

| Field | Required | Description |
|--------|----------|-------------|
| **`schemaVersion`** | yes | Must be **`1`**. |
| **`sourceNote`** | yes | One line explaining how excerpts were obtained. |
| **`entries`** | yes | Array of `{ "spellId": number, "comments": [ { "text": "..." }, ... ] }`. |

At most **five** `comments[].text` values per spell are sent to the model (first five in array order).

Example: **`fixtures/wowhead-top-comments.example.json`**.

## Commands

- **`npm run data:wowhead-digest`** — writes **`data/build/wowhead-digest-report.json`** (coverage + pilot spell id check).
- **`npm run data:wowhead-digest -- --strict-pilots`** — exit **1** if any pilot spell id lacks digest content (**`flavor`** or **`lines`**).
- **`npm run wowhead-digest:draft -- --file=path/to/batch.json`** — LLM from excerpt batch (Tier 2). Optional: **`--spell-id=N`**, **`--max=N`**.
- **`npm run content:mount-flavor-batch`** — Tier 3: OpenAI micro bullets from mount metadata only. See **`.env.example`** (`MOUNT_FLAVOR_*` / shared OpenAI keys).

### Environment (LLM)

**`content:mount-flavor-batch`** accepts (first match wins):

- **`MOUNT_FLAVOR_OPENAI_API_KEY`** or **`WOWHEAD_DIGEST_OPENAI_API_KEY`** or **`FARM_TIP_OPENAI_API_KEY`** or **`OPENAI_API_KEY`**
- **`MOUNT_FLAVOR_LLM_MODEL`** / **`WOWHEAD_DIGEST_LLM_MODEL`** / **`FARM_TIP_LLM_MODEL`** (default **`gpt-5.4`**; **`gpt-4o-mini`** still works via chat/completions)
- **`MOUNT_FLAVOR_REASONING_EFFORT`** — **`none`** / **`low`** / **`medium`** / … for **gpt-5.*** only (default **`none`** — **`low`** can leave no visible JSON if reasoning uses the output token budget)
- **`MOUNT_FLAVOR_MAX_OUTPUT_TOKENS`** — optional; base budget for Responses API (default **8192**; script retries with **2×** and **4×**, capped at **32k**)
- Base URL mirrors the same pattern; **`MOUNT_FLAVOR_LLM_DELAY_MS`** (default **900**)

**`wowhead-digest:draft`** uses **`WOWHEAD_DIGEST_*`** / **`FARM_TIP_*`** as before. Without an API key, that script can write **`data/build/wowhead-digest-llm-prompts.txt`** for manual pasting.

### Outputs (under `data/build/`)

- **`mount-flavor-batch.json`** — latest Tier 3 batch.
- **`mount-flavor-failed-spell-ids.txt`** — optional; produced by **`npm run content:mount-flavor-parse-fails -- path/to/terminal.txt`** from **`FAIL …`** lines; retry with **`--spell-ids-file=data/build/mount-flavor-failed-spell-ids.txt`** (avoids huge CLI pastes).
- **`wowhead-digest-llm-prompts.txt`** / **`wowhead-digest-llm-draft-output.json`** — Tier 2 draft flow.

## Provenance template (`data/wowhead-digest-provenance.json`)

Optional; mirror **`data/farm-tip-provenance.json`**:

```json
{
  "schemaVersion": 1,
  "batches": [
    {
      "mergedAt": "2026-03-24",
      "reviewer": "your name",
      "sourceNote": "OpenAI mount-flavor-batch from mounts.json metadata only",
      "spellIds": [40192, 72286],
      "llmModel": "gpt-5.4"
    }
  ]
}
```

Tier 3 batches also append **`data/mount-flavor-provenance.json`**.

## Adding / editing digest (manual merge)

1. Run **`content:mount-flavor-batch`** with **`--apply`**, or edit JSON by hand.
2. Ensure **`data/wowhead-comment-digests.json`** has **`flavor`** / **`lines`** / **`asOf`** per spell id.
3. Run **`npm run data:wowhead-digest`** and **`npm run build`** (or your usual checks).
