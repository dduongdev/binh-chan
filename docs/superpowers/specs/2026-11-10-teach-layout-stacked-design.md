# Teaching Screen: Stacked Layout with Pinned Action Bar

**Date:** 2026-11-10
**Size:** Small change (short design; no builder check)
**Status:** Awaiting partner approval

## Intent and why

The teaching screen (`TCH-02` before reveal, `TCH-03` after reveal) currently splits the viewport into two columns: reading passage on the left (55–60%), question and answer options on the right. The narrower left column forces the passage into a tall, scrolling column — a long reading pushes the questions and the action buttons far down the page.

The teacher wants the passage full width at the top, with the question and answer options below it.

Why: the passage is the text students read and the place where evidence appears after reveal, so it should use the full content width (shorter vertical run, bigger readable text). Whether the passage is long or short, a column layout makes the teacher scroll to reach the answers.

## Goals

- Reading passage spans the full content width on the teaching screen; question and answer options sit below it.
- `Reveal Answer` / `Next Question` are always reachable, even when the passage is longer than the viewport.
- The change is presentation only: no behavior, data, or export changes; teaching flow and evidence rules untouched.

## Non-goals

- Changing the editor screen (stays two columns on desktop, as now).
- Two-column answer options (was option C, not chosen).
- Changing the app-wide content width (`main` stays capped at 1120px).
- Changing `TCH-01` (wheel), `TCH-04` (complete), setup screen, or the editor's two-column grid.

## Approaches considered

- **A. Plain vertical stack, page scrolls.** Smallest diff; but for a long passage the `Reveal Answer` button scrolls off screen, which the current `UI_SPEC` §4.5 rule explicitly forbids. Rejected.
- **B. Vertical stack + action bar pinned to the bottom of the viewport. (chosen)** Passage full width, question below, buttons in a bar that stays at the bottom edge while the page scrolls. Keeps the §4.5 guarantee without a second scroll container, and needs no new framework concept.
- **C. B plus two-column answer options on wide screens.** Best for 5-option questions, but adds another responsive rule and the answer list is rarely the scrolling problem. Deferred; can be added later without rework.

## Design (chosen: B)

**HTML (`index.html`, `#stage-question`)**

The stage becomes a single stack, and the action row becomes a sibling of the two panels so it can pin to the viewport bottom (a sticky element cannot leave its containing block — inside the question panel it would not pin while a long passage is being read):

```html
<div id="stage-question" class="stage" hidden>
  <div class="teach-stack">
    <div class="panel">
      <div id="teach-passage" class="passage passage-big"></div>
    </div>
    <div class="panel">
      <p id="teach-student" class="teach-student"></p>
      <div id="teach-question" class="teach-question"></div>
    </div>
    <div class="teach-actions">
      <button id="btn-reveal" type="button">Reveal Answer</button>
      <button id="btn-next" class="ghost" type="button" hidden>Next Question</button>
    </div>
  </div>
</div>
```

- Panel 1 = passage only; panel 2 = student name + question; action row last.
- Student name moves from above the passage to just above the question (it is a label for the question block, and stays visually subordinate, per `UI_SPEC` §4.5).
- No id is added, removed, or renamed. `src/app.js` is untouched: it fills `#teach-passage`, `#teach-student`, `#teach-question` and toggles `#btn-reveal` / `#btn-next` exactly as now.

**CSS (`styles.css`)**

- Replace `.teach-grid` (two-column grid) with `.teach-stack { display: grid; gap: 20px; }`; delete `.teach-grid` from the responsive rule at the bottom of the file (the editor keeps its own `.editor-grid` entry).
- `#stage-question { display: block; }` so the shared `.stage` grid centering (which sizes children to max-content) does not fight the full-width stack. Deterministic width, no max-content blowout on long paragraphs.
- `.passage-big { max-width: 64ch }` → `max-width: none`: the passage fills the panel, capped only by `main`'s 1120px content width. (`passage-big` is used only on this screen.)
- `.teach-actions` gains `position: sticky; bottom: 0; background: var(--surface); z-index: 1; padding-bottom: 12px;` and keeps its existing `border-top`, right-aligned buttons and 48px-tall buttons, so it reads as a bar when it overlaps the passage.

**Documents (source of truth)**

- `docs/UI_SPEC.md` §4.5: layout section and wireframe rewritten as the stacked layout with a pinned action bar; the rule "For long passages, allow independent reading-pane scrolling without moving action buttons off screen" becomes "For long passages the page scrolls; the action bar stays pinned to the bottom of the viewport."
- `docs/UI_SPEC.md` §4.6: layout reference kept consistent (passage panel above the question).
- `docs/UI_SPEC.md` responsive table: `>= 1200 px` and `768-1199 px` rows updated — the editor stays two-column; the teaching question is a single stacked column at every width.
- `docs/MVP_SPEC.md`: no change. `TCH-03` only requires that the passage, question and all options are shown; no layout is specified, and no acceptance criterion mentions columns.

## What is left to the builder

- Verify the pinned bar in a real browser at a small viewport height with a long passage (the acceptance sweep's passage is short, so a long-passage geometry check belongs in the sweep).
- Keep the touch/narrow (`<768px`) layout working: stacked already, bar still pinned.
- Confirm the editor screenshot is unchanged.

## Verification

- Unit tests unchanged (`node --test tests/logic.test.js`, expect 11/11).
- Browser sweep (`rf_e2e.py`) plus new geometry checks: on the teaching screen the question block starts below the passage block, the passage panel spans the full content width (not ~55%), and the action bar is inside the viewport when the stage is shown.
- Visual screenshot of the teaching screen before/after reveal.
