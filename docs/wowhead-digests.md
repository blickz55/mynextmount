# Mount spotlight & Wowhead digests (Epic D.5)

## What shows on the site

Expandable rows include **Mount spotlight**: optional **flavor** paragraph plus **How to obtain** bullets (from committed data), and a link to **Wowhead** that opens the **comments** tab — **item page** when `wowheadItemId` is mapped, otherwise spell page (see **[wowhead-item-comments.md](./wowhead-item-comments.md)**).

To drive **coverage for every mount** alongside written guides, use **`docs/guide-experience-roadmap.md`** and **`npm run data:guide-experience`**.

## Data source

Committed text lives in **`data/wowhead-comment-digests.json`**, keyed by **summon spell id** (same as row **`id`** / export). Each entry may include:

- **`asOf`** — ISO date when the copy was last refreshed.
- **`flavor`** — optional short paragraph (vibe / why collectors care).
- **`lines`** — string array of acquisition / farming bullets (up to **10** merged in **`lib/mounts.ts`**).

Merged at runtime into **`Mount.wowheadMountFlavor`**, **`Mount.wowheadCommentDigest`**, and **`wowheadCommentDigestAsOf`** (see **`types/mount.ts`**).

On-screen copy explains that text is **LLM-generated from your mount metadata** (or hand-edited) and should be verified in-game.

### Tier 1 — Fully manual

Edit **`flavor`** and/or **`lines`** in JSON yourself.

### Tier 2 — LLM from **comment excerpts** (optional legacy path)

If you have lawful short excerpts (e.g. manual copy from a browser), run **`npm run wowhead-digest:draft`** — see [Input format](#input-format-for-wowhead-digestdraft). The model paraphrases into **`lines`**.

### Tier 3 — OpenAI from **`mounts.json` only** (default maintainer path)

**`npm run content:mount-flavor-batch`** calls OpenAI with a structured prompt: **flavor** + **how to obtain** bullets, **≤500 words total** per mount, using **only** fields from **`data/mounts.json`** (plus merged item id for context). **No Wowhead scraping.**

Flags: **`--limit=N`**, **`--only-missing`**, **`--spell-id=N`**, **`--flavor-force`**, **`--dry-run`**, **`--apply`**, **`--delay-ms=`**.

Writes **`data/build/mount-flavor-batch.json`**; with **`--apply`**, merges into **`data/wowhead-comment-digests.json`**. Provenance: **`data/mount-flavor-provenance.json`**.

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
- **`npm run content:mount-flavor-batch`** — Tier 3: OpenAI flavor + bullets from mount metadata only. See **`.env.example`** (`MOUNT_FLAVOR_*` / shared OpenAI keys).

### Environment (LLM)

**`content:mount-flavor-batch`** accepts (first match wins):

- **`MOUNT_FLAVOR_OPENAI_API_KEY`** or **`WOWHEAD_DIGEST_OPENAI_API_KEY`** or **`FARM_TIP_OPENAI_API_KEY`** or **`OPENAI_API_KEY`**
- **`MOUNT_FLAVOR_LLM_MODEL`** / **`WOWHEAD_DIGEST_LLM_MODEL`** / **`FARM_TIP_LLM_MODEL`** (default **`gpt-4o-mini`**)
- Base URL mirrors the same pattern; **`MOUNT_FLAVOR_LLM_DELAY_MS`** (default **900**)

**`wowhead-digest:draft`** uses **`WOWHEAD_DIGEST_*`** / **`FARM_TIP_*`** as before. Without an API key, that script can write **`data/build/wowhead-digest-llm-prompts.txt`** for manual pasting.

### Outputs (under `data/build/`)

- **`mount-flavor-batch.json`** — latest Tier 3 batch.
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
      "llmModel": "gpt-4o-mini"
    }
  ]
}
```

Tier 3 batches also append **`data/mount-flavor-provenance.json`**.

## Adding / editing digest (manual merge)

1. Run **`content:mount-flavor-batch`** with **`--apply`**, or edit JSON by hand.
2. Ensure **`data/wowhead-comment-digests.json`** has **`flavor`** / **`lines`** / **`asOf`** per spell id.
3. Run **`npm run data:wowhead-digest`** and **`npm run build`** (or your usual checks).
