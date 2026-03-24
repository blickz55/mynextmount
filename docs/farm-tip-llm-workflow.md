# Farm tip LLM workflow (Epic C.4)

This is the **optional Phase C** path for expanding **`data/farm-tips.json`**. It is **not** run by **`npm run data:build`** or any other Phase B script (see **`docs/data-harvesting.md`** — Phase B build boundary).

## Governance

1. **Lawful input only** — Paste or type **short excerpts** you are allowed to use (your own notes, paraphrase after reading Wowhead, text you have permission to use). Do **not** bulk-scrape comments, Reddit HTML, or violate site **ToU** / **robots.txt**.
2. **LLM = draft assistant** — The model must **paraphrase**; the committed string must be **human-reviewed** and must not be a verbatim copy of third-party comments.
3. **Provenance** — Before merging tips, append a batch to **`data/farm-tip-provenance.json`** (`reviewer`, `sourceClass`, `spellIds`, optional `llmModel`).

## Commands

```bash
# Offline: writes data/build/farm-tip-llm-last-prompt.txt (system + user) + minimal JSON metadata
node scripts/farm-tip-llm-draft.mjs --file=fixtures/farm-tip-excerpt.example.txt

# With OpenAI key in .env.local (never commit):
# FARM_TIP_OPENAI_API_KEY=...
# Optional: FARM_TIP_LLM_MODEL=gpt-4o-mini  FARM_TIP_OPENAI_BASE_URL=https://api.openai.com/v1
npm run farm-tip:draft -- --file=path/to/your-excerpts.txt
```

Excerpt file format:

- `# spellId: 12345` (optional if you pass `--spell-id=12345`)
- `# sourceNote: …` (how you obtained the text)
- Blank line, then **excerpt body**

## After the model runs (or browser LLM)

1. Edit **`data/farm-tips.json`** — add or update the string key = summon spell id.
2. **`npx tsc --noEmit`** — types still merge tips in **`lib/mounts.ts`**.
3. Update **`data/farm-tip-provenance.json`** with a new **`batches[]`** entry.
4. PR description: spell ids + **sourceNote** summary + reviewer name.

## Outputs (gitignored under `data/build/` except you may commit reports intentionally)

- **`data/build/farm-tip-llm-last-prompt.txt`** — last full prompt.
- **`data/build/farm-tip-llm-draft-output.json`** — metadata; with API key includes **`draftTip`** for copy/paste after review.

**Do not** commit API keys or raw long third-party dumps.
