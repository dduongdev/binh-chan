# Teaching Setup: Decorative Spinning Wheel Preview

**Date:** 2026-11-10
**Size:** Small change (short design; no builder check)
**Status:** Approved by partner (approach + design agreed in conversation)

## Intent and why

The Teaching Setup screen (`SET-01`) is a single centered column: reading summary, student-name textarea, counter, Start Session. The teacher cannot see the wheel until the session starts.

The partner wants a wheel preview on the right — gently spinning, no Spin button — so the screen shows what the names turn into, and feels lively.

## Goals

- Show a live preview of the wheel beside the name field, updating as names are typed.
- The wheel rotates continuously on its own; there is no Spin control and no result.
- Reuse the existing SVG wheel; no new library, no second drawing routine.
- Presentation only: session behaviour, name parsing, and evidence rules untouched.

## Non-goals

- No spin, no random selection, no pointer, no selected name on the setup screen.
- No change to `SET-01` validation, the roster model, or the teaching session.
- No change to the wheel on the spin stage (`TCH-01`).

## Approaches considered

- **Static preview** (the first proposal): smallest, but the partner asked for motion — a still wheel reads as decoration only.
- **Interactive wheel with Spin on setup**: duplicate session state (`session.state` does not exist before Start Session) and two ways to select a student. Rejected.
- **Decorative rotation, no Spin. (chosen)** Motion without a second source of truth.

## Design

**Markup (`index.html`, `#teach-setup`)**

```html
<div id="teach-setup" class="setup">
  <div class="setup-form">
    <p id="teach-summary" class="teach-summary"></p>
    <label class="field">
      <span>Student Names</span>
      <textarea id="teach-students" rows="10" placeholder="Enter student names, one per line..."></textarea>
    </label>
    <p class="hint">Paste a list from a spreadsheet or type names on separate lines.</p>
    <p id="setup-error" class="warn" hidden>Add at least one student to start.</p>
    <div class="setup-foot">
      <span id="teach-count">0 students</span>
      <button id="btn-start-session" type="button" disabled>Start Session</button>
    </div>
  </div>
  <div class="setup-wheel" aria-hidden="true">
    <div id="setup-wheel" class="wheel-slot"></div>
  </div>
</div>
```

**CSS (`styles.css`)**

- `.setup` becomes `max-width: 1000px; display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: start;` (two equal halves, per the partner at execution time); the existing `@media (max-width: 940px)` block adds `.setup { display: block; }` and `.setup-wheel { margin-top: 22px; }`.
- `.setup-wheel { width: 100%; aspect-ratio: 1; overflow: hidden; }` — the slot fills its half, and the container clips the rotated bounding box (a square rotated 45° is ×1.41 wide) so the spinning preview never adds a horizontal scrollbar. The disc is inscribed in the square, so nothing of the wheel itself is clipped.
- `#setup-wheel { animation: setup-wheel-spin 20s linear infinite; }` plus `@keyframes setup-wheel-spin { to { transform: rotate(360deg); } }`.
- The animation lives on the **slot**, not on the SVG's `.wheel-rotor`: the SVG is rebuilt on every keystroke, and rotating the slot keeps the spin continuous instead of restarting it at 0° per character.
- `prefers-reduced-motion` is already handled globally (`styles.css` reduces every animation to .001ms), so the preview is static for those users with no extra code.

**Behaviour (`src/app.js`)**

- `buildWheelSVG(students, container)` — the second parameter defaults to `el('wheel-wrap')`; the session call sites are unchanged. A student may carry `label`, which wins over `labelFor(st.id)` — the setup screen has no session, so `labelFor` cannot resolve names there.
- `updateSetup()` additionally calls `buildWheelSVG(...)` with the parsed, disambiguated names and `el('setup-wheel')`, so the preview follows typing and is drawn when the screen opens (empty list → the existing grey disc).

**Documents**

- `docs/UI_SPEC.md` §4.3: add the preview to Structure and Layout principles — right column, decorative, slowly rotating, no pointer, no selected name, static under reduced motion, and it reacts to typing.
- `docs/UI_SPEC.md` §5: `StudentWheel` row mentions the decorative preview on Teaching Setup.
- `docs/UI_SPEC.md` §6.2: reduced motion note covers the preview.
- `docs/MVP_SPEC.md`: no change — `SET-01` requirements and AC-10 describe name entry and counting, not layout.

## Left to the builder

- The exact rotation duration (20s) is a starting value; adjust if the wheel looks nervous on a projector.
- Verify the preview at narrow widths (single column, wheel below the form) and that it never pushes Start Session off screen.

## Verification

- Unit tests unchanged (`node --test tests/logic.test.js`, 11/11).
- Browser sweep: preview SVG exists, its slot has a running animation, it draws one label per typed name, it is `aria-hidden`, it has no pointer/selected name, and it updates when the names change.
- Screenshot of the setup screen at 1440×1000 and 375×800.