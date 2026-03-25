# Mobile smoke checklist (Epic H.1)

Use **Chrome DevTools** (or Safari Web Inspector) at **~390×844** (iPhone 12/13) and once on a **real device** if possible. Verify **`/`** (coming soon) and **`/tool`** (recommender).

## Brand → home (H.2)

- [ ] On **`/tool`**, tap **MyNextMount** (logo + title + tagline block) → lands on **`/`**.
- [ ] On **`/`**, same block still works (stays home / soft navigation).
- [ ] **Focus:** Tab to brand; **focus ring** visible on **`.site-brand__home`**.

## Layout & scroll

- [ ] No **horizontal scroll** on main content (code blocks in How To may scroll inside their panel only).
- [ ] **Safe areas:** With `viewport-fit=cover`, content is not clipped by notch or home indicator (padding via **`env(safe-area-inset-*)`** on **`.app-main.app-shell`**).
- [ ] **Viewport:** Page uses device width (no “tiny desktop” zoom).

## Touch & targets

- [ ] **Theme** control is easy to tap (~44px min dimension).
- [ ] **Find My Mounts** / **Open the recommender** CTA is comfortable to tap.
- [ ] **Mode** radios (Easiest / Rarest) have a full-row tap feel.
- [ ] **Source filters** stack in a single column on narrow widths; each row is tappable.
- [ ] **Disclosure** summaries (“View Your Mounts”, farm tips, rarest showcase) are tappable without precision taps.
- [ ] **Paste textarea:** Focusing it on **iOS** does not trigger unwanted zoom (font size **≥16px** in the mobile media query).

## Readable copy

- [ ] How To and body text stay readable at **≤390px** (slightly larger minimums in CSS).

## Functional

- [ ] Paste export → submit → scroll through **farm list** load-more; cards wrap long names without overflow.
- [ ] Open **View Your Mounts** with a **large** export (≥48 mounts): virtualized grid scrolls smoothly; **1 column** on narrow width.

## Regression

- [ ] **Desktop** layout unchanged at **≥768px** (spot check).

---

*CSS changes live in **`app/globals.css`** (section *Epic H.1*). Viewport metadata: **`app/layout.tsx`** → `export const viewport`.*
