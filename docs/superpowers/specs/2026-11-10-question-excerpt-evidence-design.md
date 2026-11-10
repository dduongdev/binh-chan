# ReadingFlow: Per-Question Reading Excerpts

**Date:** 2026-11-10
**Size:** Project change (full design + builder check)
**Status:** Approved by partner (conversation, 2026-11-10) — plan written; no code before plan approval

## Intent and why

Today a reading lesson stores the **entire book passage** (`Reading.content`) once, and every question marks Key Evidence somewhere in that whole passage, optionally framed by a Supporting Passage.

The partner wants the opposite shape:

- A lesson is **a title plus questions**. There is no whole-reading passage field, and the whole reading is not stored anywhere — not even for the teacher to view or project.
- **Each question owns one excerpt** — a short passage copied from the book, typed or pasted by the teacher while configuring that question.
- Key Evidence is highlighted **inside that question's excerpt**.
- **Supporting Passage disappears as a concept.** The excerpt already is the supporting passage, so only one highlight level remains: Key Evidence.

Why this is better for the teacher: the teaching screen shows exactly the lines a student needs to reason from, not a wall of text the class must search. Preparing a question means pasting one paragraph instead of scrolling a whole chapter.

## Goals

1. A reading stores **no whole-reading text**; only `title` and `questions`.
2. Every question stores its own plain-text `passage` (the excerpt) and `keyEvidence[]` offset into **that excerpt**.
3. The editor keeps the **Edit / Mark** split per excerpt, so ordinary typing cannot create highlights.
4. Evidence is optional for readiness. The excerpt is required.
5. The teaching screen shows the **current question's excerpt**, before and after reveal.
6. Old readings in the browser are ignored; the new build starts empty.

## Non-goals

- No shared "excerpt pool" reused across questions.
- No migration of `readingflow.readings.v1` data.
- No multiple excerpts per question; no per-question quote field separate from the excerpt.
- No change to the wheel, Keep/Remove, student parsing, full-screen, or session state machine.
- No AI generation, OCR, PDF/Word import, or rich text.

## Constraints

- Vanilla HTML/CSS/JS, no framework, no bundler, no build step (AGENTS.md §2).
- Teacher input is rendered as **text nodes only** — never `innerHTML` (AGENTS.md §3).
- Offsets are half-open `[startOffset, endOffset)`, UTF-16 indices, derived from the DOM selection, **never** from `indexOf` (AGENTS.md §3).
- All UI copy is English.
- `localStorage` only; no backend.

## Approaches

**A — excerpt lives inside each question (chosen).**
`question.passage` + `question.keyEvidence[]`. Each question is self-contained. Two questions that need the same text each hold their own copy. No new deletion semantics.

**B — a per-reading excerpt pool; questions point into it (rejected).**
Less duplicated text and reusable excerpts, but it adds a second entity, a management surface nobody asked for, and a new class of question ("which questions lose their evidence if this excerpt is deleted?"). Cost is higher than the duplication it saves.

The partner chose **A**.

## Data model

```ts
type Reading = {
  id: string;
  title: string;
  questions: Question[];
  createdAt: number;
  updatedAt: number;
};

type Question = {
  id: string;
  order: number;
  prompt: string;
  passage: string;          // NEW: the question's excerpt, plain text, line breaks preserved. '' when empty.
  options: AnswerOption[];
  correctOptionId: string | null;
  keyEvidence: TextRange[]; // offsets into THIS question's passage
};

type TextRange = { startOffset: number; endOffset: number }; // half-open, UTF-16
```

Removed: `Reading.content`, `Question.supportingPassage`.

`keyEvidence` ranges are validated against `question.passage`, filtered defensively with `validRange` before rendering, and silently dropped if they no longer fit (they can only get stale through corrupt storage; the editor clears them on text change).

## Editor

### Layout

The two-column editor stays. The **left panel stops being the whole reading** and becomes the active question's excerpt. The right panel stays exactly as it is (tabs, prompt, options, evidence status/actions).

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ← My Readings   Reading Editor            [Save Reading] [Start Teaching] │
│ Reading Title  [ A Rainy Afternoon                                     ]  │
├───────────────────────────────────────┬──────────────────────────────────┤
│ READING EXCERPT · QUESTION 1          │ QUESTIONS                        │
│ [Edit Excerpt] [Mark Evidence]        │ [1] [2] [3]  [+ Add Question]    │
│                                       │                                  │
│ Anna wanted to visit the park...      │ Question                         │
│ However, it was raining heavily...    │ [Why did Anna stay at home?    ] │
│                                       │                                  │
│                                       │ ( ) She felt tired.              │
│                                       │ (●) It was raining heavily.      │
│                                       │ ( ) She forgot her bag.          │
│                                       │ [+ Add Option]                   │
│                                       │                                  │
│                                       │ EVIDENCE                         │
│                                       │ ✓ 2 Key Evidence highlights      │
│                                       │ [Highlight Key Evidence]         │
│                                       │ [Clear Key Evidence]             │
└───────────────────────────────────────┴──────────────────────────────────┘
```

- Panel heading: **Reading Excerpt**; a small dynamic sub-label shows **Question 1**, **Question 2**, etc. (`#ed-excerpt-for`).
- No active question: the textarea and both mode buttons are disabled, the panel shows **Add a question to write its excerpt.**, and the evidence actions stay disabled.
- The excerpt field is the only place the reading text exists. There is no second quote box (EVD-12).

### Edit / Mark modes

`editing.mode` stays global (`'edit' | 'mark'`) and applies to whichever question is active.

- **Edit Excerpt** (renamed from *Edit Passage*): textarea bound to `currentQuestion().passage`, placeholder **Paste or type this question's excerpt from the book...**, line breaks preserved.
- **Mark Evidence**: the textarea is replaced by `#passage-preview`, which renders the active question's excerpt as selectable text with its Key Evidence marks.
- Switching question tabs swaps the left panel to that question's excerpt and does **not** change the mode.
- **Add Question** switches to Edit mode, because a new question always needs an excerpt typed. It first reconciles the outgoing question (same guard as switching tabs): if the teacher cancels the confirmation, **no question is created** and the editor stays where it was. If they confirm, that question's highlights are cleared and the new question is added.
- **Move Up / Move Down** keep the same active question object, so the baseline is not reset and no reconcile runs.
- **Delete Question** already confirms deletion; the deleted question's unsaved excerpt goes with it. After deletion the baseline is reset to the newly active question's `passage`.

### Editing an excerpt that has highlights

Only the active question is affected. This replaces SPEC §6.5's "clear every question's evidence".

1. Typing updates `currentQuestion().passage` immediately (so switching tabs / saving cannot lose it), but does not touch evidence yet.
2. When the teacher leaves Edit mode (switch to Mark, switch question, save, or Start Teaching) the editor compares the excerpt with the baseline text that the existing ranges were drawn against.
3. If the text changed and that question has highlights, confirm: **Editing this excerpt will clear its evidence highlights. Continue?**
   - Cancel → restore the baseline text into the textarea and into `question.passage`; keep the highlights; abort the leaving action (stay in Edit mode / stay on the question).
   - Continue → keep the new text and clear **only this question's** `keyEvidence`; other questions are untouched.
4. If the text is unchanged, nothing is cleared.
5. No automatic offset reconciliation.

Baseline handling: one `editing.baselinePassage` string, owned by the **active question object**, not by the tab index. Reset it when the editor opens, when a tab selection or Add Question makes a different question active, after a confirmed reconcile, and after a delete; **not** on Move Up/Down (same object) and not inside `renderEditor` (otherwise every render would forgive the edit).

### Evidence actions

Under the active question (current location, one row):

- **Highlight Key Evidence** — enabled only in Mark mode with a non-empty selection inside `#passage-preview`; stores the selection's offsets into the active question's `passage`; merges overlapping/adjacent ranges (existing `mergeRanges`).
- **Clear Key Evidence** — clears all ranges for the active question (existing behavior, no confirmation).
- Clicking (or Enter/Space on) a highlight in the preview removes that single range (existing behavior).
- **Removed:** `Set Supporting Passage`, `Clear Supporting Passage`, and their status line.

Status under the question becomes one line: `0 Key Evidence highlights` / `✓ 2 Key Evidence highlights`; with no question: **Add a question to write an excerpt and mark evidence.**

## Validation and readiness

`Logic.validatePassage` becomes:

1. Reading title is not blank.
2. There is at least one question.
3. Every question has a non-empty prompt.
4. Every question has at least two non-empty answer options.
5. Every question has exactly one correct option (an existing filled option id).
6. Every question's **excerpt** contains non-whitespace text.

Key Evidence is **not** required. Invalid evidence ranges never block readiness; they are filtered out of rendering.

Problem copy: `Question N has no reading excerpt.` (new). The existing messages for title, question count, prompt, options, and correct answer stay.

## Teaching session

- `renderQuestionStage` renders `question.passage`, not `session.reading.content`. Before reveal: plain excerpt, no marks. After reveal: excerpt with that question's `keyEvidence` marks.
- `renderPassage(container, text, keys)` and `Logic.passageSegments(text, keys)` lose the Supporting Passage level. Levels become `'text' | 'key'`.
- The teaching panel label in specs becomes **Reading Excerpt**. The panel itself keeps its current DOM and `.passage-big` styling.
- Everything else (wheel, Keep/Remove, progress, completion, full screen) is unchanged.
- The session snapshot already clones the reading, so it now snapshots each question's excerpt automatically.

## Library

- Cards keep title, question count, date, ready/draft badge, and actions.
- Add one preview line from the **first question's excerpt**, single line with CSS ellipsis; **No excerpt yet.** when the first question has no text. This satisfies `ReadingCard`'s "passage preview" without storing a whole-reading field.
- Search stays title-only.

## Storage

- `STORAGE_KEY` becomes `'readingflow.readings.v2'`.
- `loadReadings()` reads only v2; a missing or malformed value yields `[]`.
- `persist()` writes v2.
- `readingflow.readings.v1` is never read, migrated, or deleted. The old data stays in the browser, invisible to the new build.

## Spec and code surface

| File | What changes |
| --- | --- |
| `src/logic.js` | `passageSegments(text, keys)` (drop `support`); `validatePassage` (drop content and key-evidence requirement, add per-question excerpt). |
| `src/app.js` | `STORAGE_KEY`; `newReading` (no `content`); `newQuestion` (`passage`, no `supportingPassage`); `openEditor`/`renderEditor`/`selectQuestion`/`addQuestion`/`deleteQuestion`; `renderPreview`; `renderEvidenceStatus`; `updateEvidenceButtons`; delete `setSupportingPassage`/`clearSupport`; `reconcileExcerpt` (replaces `reconcileContent`); `saveEditor`; `renderQuestionStage`; library preview line. |
| `index.html` | Left panel heading + sub-label, mode labels, excerpt placeholder/hint; remove `btn-set-support` / `btn-clear-support`. |
| `styles.css` | Remove `.mark-support` and `--color-support`; add excerpt sub-label and library preview line; no layout rewrite needed. |
| `tests/logic.test.js` | Update segment/validation fixtures; add excerpt-required and highlight-optional cases. |
| `docs/MVP_SPEC.md` | v2.2 header; §1.1/§1.2 purpose and principles; §2.1/§2.2; §3.1/§3.2; §4.2 EDT; §4.3 QST (add excerpt requirement); §4.4 EVD (single level); §4.7 TCH-03/04/05; §5 and §5.1; §6.1/6.2/6.4/6.5/6.6/6.7; §7 reveal wording; §8 scenarios A/B; §9; §10 ACs; §11 sequence; §12 deferred items. |
| `docs/UI_SPEC.md` | §1.3 rule 4; §2.1 colors; §4.1 card preview; §4.2 editor (sketch, A/B/C, toolbar, copy); §4.5/§4.6 teaching; §5 component table; §7.3 long content; §9 copy inventory; §10 variants + sample lesson; §11 handoff rules; §12 checklist. |
| `AGENTS.md` | Preamble version (v2.0 → v2.2); §1 main flow; §2 code status (SPEC v2.2, model description); §3 invariants: single-level evidence inside each question's excerpt, offsets relative to `question.passage`, excerpt edit clears only that question's highlights, six readiness conditions. |

### Acceptance criteria rewrite

- `AC-01` — type a multi-paragraph excerpt for a question and a title, save, reopen: text and paragraph breaks persist; there is no whole-reading field.
- `AC-03` — select a phrase in Q1's excerpt: only that range gets the strong style while Q1 is active.
- `AC-04` — select two phrases in one excerpt: both stand out; overlapping selections merge.
- `AC-05` — two questions with different excerpts: each shows only its own excerpt and highlights.
- `AC-06` — edit an annotated excerpt and confirm: only that question's highlights are cleared; other questions keep theirs.
- `AC-08` — a reading with title, question, two options, one correct answer, and excerpt but **no highlights** is Ready and can Start Teaching.
- `AC-15` — before Reveal: no correct-answer styling and no highlights.
- `AC-16` — after Reveal: exactly one correct option and only the current question's Key Evidence.
- `AC-02`, `AC-07`, `AC-09`..`AC-14`, `AC-17`..`AC-20` keep their intent with "passage" read as "excerpt".

## Tests

Unit (`node --test tests/logic.test.js`):

1. Existing range merge/containment tests unchanged.
2. `passageSegments` returns text/key segments only; overlapping keys merge; out-of-range keys are dropped.
3. `validatePassage`: ready with title + one question + 2 options + 1 correct + excerpt, **zero** highlights.
4. `validatePassage`: not ready when a question's excerpt is blank (message names the question).
5. `validatePassage`: not ready on blank title / no questions / short options / missing correct answer (existing cases, new fixture shape).
6. Editor guard behaviour (can live in the browser sweep rather than unit tests): cancel keeps the old text and highlights and aborts the tab switch / Add Question; confirm clears only the outgoing question's highlights; Move Up/Down never triggers the guard.

Browser sweep (Playwright/Edge, outside the repo): rewrite the editor/evidence/teaching checks for per-question excerpts, including the cancel path (text restored, highlights kept) and the confirm path (only that question cleared). Keep wheel/setup checks unchanged.

## Left to the builder

- Exact CSS for the excerpt sub-label and the library preview line.
- Whether `ed-hint` copy needs a second sentence in Mark mode when the excerpt is empty.
- Test fixture names and sweep step order.

## Risks and trade-offs

- **Old lessons disappear** from the new build. Accepted by the partner ("kệ"); the old key is untouched, so nothing is destroyed.
- **Duplicated text** when two questions quote the same lines. Accepted cost of approach A.
- **No whole-reading view** during teaching. Intentional: the class reads only the lines the question depends on.
- **Excerpt quality is now load-bearing**: a too-short excerpt can make a question unanswerable from the screen. The excerpt is required for readiness, but its length is the teacher's judgement; the spec gives guidance, not a minimum.
