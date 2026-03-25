# Wowhead comment digests (Epic D.5)

## What shows on the site

Expandable rows include **Community tips (summarized)** — up to **five** short bullets — plus **Open full comments on Wowhead** (same URL rules as [wowhead-links.md](./wowhead-links.md)).

To drive **digest coverage for every mount** alongside written guides, use **`docs/guide-experience-roadmap.md`** and **`npm run data:guide-experience`**.

## Data source

Committed text lives in **`data/wowhead-comment-digests.json`**, keyed by **summon spell id** (same as row **`id`** / export). Each entry has:

- **`asOf`** — ISO date for when the digest text was last reviewed.
- **`lines`** — string array (max **5** shown after merge in **`lib/mounts.ts`**).

Merged at runtime into **`Mount.wowheadCommentDigest`** and **`wowheadCommentDigestAsOf`** (see **`types/mount.ts`**).

### Tier 1 — Fully manual

You write **`lines`** yourself from general game knowledge. No third-party comment text involved.

### Tier 2 — LLM from **top comment excerpts** (allowed path)

This is the supported workflow when you want the UI to reflect **what the thread emphasizes**, without pasting Wowhead verbatim into the repo.

1. **Lawful inputs only** — For each mount, collect up to **five** comment bodies from the Wowhead spell page (typically the **highest-voted** or **top of thread**). Obtain them in a way you are comfortable with under [Wowhead Terms of Use](https://www.wowhead.com/terms-of-use) and your risk tolerance — e.g. **manual copy from your browser** while you review the page. Do **not** commit raw comment dumps to git; keep excerpts only in **local** JSON batches under `data/build/` if needed, or paste into a fixture you delete after merging.
2. **LLM = paraphrase engine** — Run **`npm run wowhead-digest:draft`** with a JSON batch (see [Input format](#input-format-for-wowhead-digestdraft)). The model must output **new wording**; **review** is recommended before merge but **not required** by repo policy (see **`docs/data-harvesting.md`** — *Maintainer override*).
3. **Merge** — Copy **`lines`** (and **`asOf`**) into **`data/wowhead-comment-digests.json`** (or use a batch script that writes the file directly when you automate).
4. **Provenance (recommended)** — Append a batch row to **`data/wowhead-digest-provenance.json`** (see template below): reviewer, **`sourceNote`**, spell ids, optional **`llmModel`**.

**Product copy** should still present these as **summarized community tips**, not as official Wowhead or Blizzard text.

### Tier 3 — Automated batch pipeline (maintainer)

The maintainer may run **custom** scripts (invoked via **`npm run …`**) that fetch or derive comment text, paraphrase via LLM, and write **`data/wowhead-comment-digests.json`** in bulk. **ToS / legal risk is on the operator.** Cursor/agents are **allowed** to implement this when asked — see **`.cursorrules`** and **`docs/data-harvesting.md`** (*Maintainer override*).

Prefer **paraphrase**; do not commit **verbatim** full threads or raw HTML snapshots when you can avoid it.

## Input format for `wowhead-digest:draft`

JSON file:

| Field | Required | Description |
|--------|----------|-------------|
| **`schemaVersion`** | yes | Must be **`1`**. |
| **`sourceNote`** | yes | One line explaining how excerpts were obtained (audit / PR transparency). |
| **`entries`** | yes | Array of `{ "spellId": number, "comments": [ { "text": "..." }, ... ] }`. |

At most **five** `comments[].text` values per spell are sent to the model (first five in array order — put most useful first).

Example: **`fixtures/wowhead-top-comments.example.json`**.

## Commands

- **`npm run data:wowhead-digest`** — writes **`data/build/wowhead-digest-report.json`** (coverage counts + pilot spell id check).
- **`npm run data:wowhead-digest -- --strict-pilots`** — exit **1** if any of the six guide pilot spell ids lack a non-empty digest.
- **`npm run wowhead-digest:draft -- --file=path/to/batch.json`** — LLM draft from excerpt batch (see [Tier 2](#tier-2--llm-from-top-comment-excerpts-allowed-path)). Optional: **`--spell-id=N`**, **`--max=N`**.

### Environment (LLM)

Same OpenAI-compatible variables as farm tips, with digest-specific overrides optional:

- **`FARM_TIP_OPENAI_API_KEY`** or **`WOWHEAD_DIGEST_OPENAI_API_KEY`**
- **`FARM_TIP_OPENAI_BASE_URL`** / **`WOWHEAD_DIGEST_OPENAI_BASE_URL`** (default `https://api.openai.com/v1`)
- **`FARM_TIP_LLM_MODEL`** / **`WOWHEAD_DIGEST_LLM_MODEL`** (default `gpt-4o-mini`)
- **`WOWHEAD_DIGEST_LLM_DELAY_MS`** — pause between mounts when batching (default **750**).

Without an API key, the script writes **`data/build/wowhead-digest-llm-prompts.txt`** for manual pasting into any chat LLM.

### Outputs (under `data/build/`)

- **`wowhead-digest-llm-prompts.txt`** — full prompts per spell.
- **`wowhead-digest-llm-draft-output.json`** — metadata + **`drafts`** + **`suggestedMergeIntoWowheadCommentDigests`** (apply only after review).

## Provenance template (`data/wowhead-digest-provenance.json`)

Optional; mirror the spirit of **`data/farm-tip-provenance.json`**:

```json
{
  "schemaVersion": 1,
  "batches": [
    {
      "mergedAt": "2026-03-24",
      "reviewer": "your name",
      "sourceNote": "Manual top-5 comment excerpts from Wowhead spell pages; LLM paraphrase via wowhead-digest:draft",
      "spellIds": [40192, 72286],
      "llmModel": "gpt-4o-mini"
    }
  ]
}
```

## Adding / editing a digest (manual merge)

1. Run **`wowhead-digest:draft`** or write **`lines`** by hand.
2. Merge into **`data/wowhead-comment-digests.json`** for the spell id.
3. Bump **`asOf`** when text changes materially.
4. Run **`npm run data:wowhead-digest`** and **`npm run build`** (or your usual checks).
