# Accessibility baseline (Epic I.2)

Manual audit of **`/`** (coming soon) and **`/tool`** (recommender): keyboard, contrast spot-check, and screen-reader-oriented structure. **Date:** 2025-03-25.

## Summary

No **blocking** issues found for the core flows after the fixes below. Residual items are **low severity** or **nice-to-have** (automated regression, copy tweaks).

---

## Keyboard

| Area | Result |
|------|--------|
| **Skip link** | **`SkipToMainContent`** in **`app/layout.tsx`** — first tab stop; jumps to **`#main-content`** (`tabIndex={-1}` on **`<main>`** on **`/`** and **`/tool`**). |
| **Theme toggle** | Button cycles theme; visible focus ring (existing **H.1**). |
| **Site brand** | Single **Link** to **`/`**; focus ring on **`.site-brand__home`**. |
| **Export form** | Tab order: textarea → mode radios → **Find My Mounts** → results region. |
| **Source filters** | Checkboxes + labels in **`<fieldset>`** with **`<legend>`**. |
| **Disclosures** | Native **`<details>` / `<summary>`** — Space/Enter toggle; focus styles on summaries. |
| **Farm list “load more”** | Intersection observer alone is mouse/scroll-biased. **Mitigation:** explicit **Load more mounts** button (**`.btn-secondary`**) when more rows exist (same batch size as infinite scroll). |
| **External links** | How-to / coming-soon links open in new tab; keyboard reachable. |

---

## Contrast (spot-check, WCAG-oriented)

Checked **light** (`:root` / **`data-theme="light"`**), **system dark**, and **`data-theme="dark"`** for primary text, links, buttons, errors, and focus rings.

| Observation | Severity |
|-------------|----------|
| Body **`.text` / `.text-muted` / `.text-soft`** on parchment / dark cards — primary copy and **`.lead`** read clearly; **`.text-soft`** / small **`.mode-hint`** are secondary; acceptable for non-essential copy. | Low — re-check if body text drops below **~14px** or if tokens change. |
| **`.accent-danger`** error text — distinguishable in light and dark. | OK |
| **Focus rings** use **`--focus-ring`** (gold family) with sufficient separation from page chrome. | OK |

**Follow-up (optional):** run **WebAIM Contrast Checker** or **axe DevTools** on both themes after any token change.

---

## Screen readers & structure

| Topic | Implementation |
|-------|----------------|
| **Language** | **`lang="en"`** on **`<html>`** (**`app/layout.tsx`**). |
| **Landmarks** | One **`<main>`** per page (**`id="main-content"`**); brand in **`<header class="site-brand">`** (**`SiteBrand`**). |
| **Headings** | **`h1`** in brand; section **`h2`**s on panels (How To, results, coming-soon sections). |
| **Form** | **`<label htmlFor="export">`**; textarea **`aria-describedby`** (hint + error id when invalid); **`aria-invalid`** when parse fails. |
| **Live regions** | Mode line **`aria-live="polite"`**; submit **`<p role="status">`**; parse errors **`role="alert"`**; farm count **`aria-live="polite"`**; filter / empty / end-of-list messages **`role="status"`** + **`aria-live="polite"`** where dynamic. |
| **Per-row disclosures** | **`<summary>`** prefixed with visually hidden mount name (**`.sr-only`**) so adjacent **“Farm guide…”** rows are distinguishable. |
| **Owned mounts grid** | **`role="list"`** / **`listitem`**; virtualized viewport has **`aria-label`**. |
| **Decorative icon** | **`MountIcon`** **`alt=""`** (name adjacent). |

**Follow-ups (not shipped)**

- Optional **“opens in new tab”** hint on external **`<a target="_blank">`** (verbose in lists — product choice).
- **`prefers-reduced-motion`:** scroll-into-view on submit already respects reduced motion; no other motion-heavy UI.
- **Automated checks:** add **`@axe-core/playwright`** or **eslint-plugin-jsx-a11y** in a later epic if desired.

---

## Verification checklist (manual)

Use **VoiceOver** (Safari) or **NVDA** (Firefox) + keyboard only.

- [ ] **Tab** from load: skip link → theme → brand → …  
- [ ] Activate skip link: focus moves to main; visible focus outline on **`<main>`**.  
- [ ] **`/tool`:** invalid paste → error announced; valid paste → status + optional scroll to results.  
- [ ] Toggle a **source filter**; empty-state message updates.  
- [ ] Expand **View Your Mounts** and a row **Farm guide / Community** disclosure; summaries sound distinct per mount.  
- [ ] **Load more** button increases visible count without relying on scroll.  

See also **`docs/mobile-smoke-checklist.md`** for touch/layout overlap with **H.1**.
