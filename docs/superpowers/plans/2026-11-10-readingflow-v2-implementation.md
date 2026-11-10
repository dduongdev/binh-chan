# ReadingFlow MVP (SPEC v2.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old single-level-highlight, auto-no-repeat app with the SPEC v2.0 product: 4 areas (`LIB`/`EDT`/`SET`/`TCH`), two-level per-question evidence, and an explicit Keep/Remove wheel.

**Architecture:** No build step. Pure, DOM-free logic in `src/logic.js` (unit-tested with `node --test`); a single DOM controller `src/app.js` (IIFE, Vietnamese comments) drives `index.html` and reads `styles.css`. Readings persist in `localStorage`; session state lives only in memory. All evidence is rendering metadata over one canonical `content` string — never HTML tags in stored text.

**Tech Stack:** Vanilla HTML + CSS + ES5-compatible JavaScript (IIFE, `var`/`const`, no framework, no bundler). Tests: Node's built-in `node:test` + `node:assert`.

**Spec:** `docs/MVP_SPEC.md` (v2.0, behaviour = source of truth) and `docs/UI_SPEC.md` (visual/copy).

## Global Constraints

- **English only** for every visible string (labels, errors, empty states) — SPEC §9, AC-20. Vietnamese is allowed only in code comments.
- **No framework, no bundler, no build step, no backend, no network call** (AGENTS.md §2).
- **Offsets are half-open** `[startOffset, endOffset)`, UTF-16 indices into the canonical `Reading.content`; derived from the DOM selection, **never** `indexOf` (a phrase can repeat).
- **Two evidence levels per question:** one contiguous `supportingPassage` (level 1) + `keyEvidence[]` fully inside it (level 2, ≥ 0 while drafting).
- **Nothing reveals before `Reveal Answer`** — no correct-option styling and no evidence (TCH-04, EVD-13).
- **Wheel never auto-removes.** Only explicit **Remove** deactivates; **Keep** keeps; **Spin Again** changes nothing (SPN-05..09).
- **All teacher input renders as text** (`textContent` / text nodes) — never `innerHTML`.
- Data model field names are locked to SPEC §6: `Reading{id,title,content,questions,createdAt,updatedAt}`, `Question{id,order,prompt,options,correctOptionId,supportingPassage,keyEvidence}`, `AnswerOption{id,text,order}`, `TextRange{startOffset,endOffset}`.
- Readiness = the 9 conditions in SPEC §5; drafts always save.

## Review Focus

Input classes / failure modes the spec implies but no single test fully covers — each has a test or explicit manual step in the owning task:

1. **Duplicate student names** — kept as separate entries with distinct ids; labelled `Alex Kim (2)` on the wheel (Task 1 test + Task 5 UI).
2. **Key evidence crossing the supporting-passage boundary** — rejected with `Select a phrase inside the Supporting Passage.` (Task 1 `containedIn` test + Task 4 UI).
3. **Adjacent or overlapping key evidence** — merged into one range, not double-styled (Task 1 `mergeRanges` test).
4. **Editing an annotated passage** — warn, then clear **every** question's evidence on confirm; Cancel restores untouched (Task 4, AC-08 manual).
5. **Repeated phrase in the passage** — the range binds to the selected occurrence, not the first match (Task 4, AC-03/AC-04 manual — selection-derived offsets).

---

### Task 1: Pure logic module

**Files:**
- Modify: `src/logic.js` (new API — already drafted)
- Test: `tests/logic.test.js` (replace all old tests)

**Interfaces:**
- Consumes: nothing.
- Produces (global `window.Logic` / `module.exports`): `newId()`, `validRange(range, content) -> bool`, `containedIn(inner, outer) -> bool`, `mergeRanges(ranges) -> TextRange[]`, `parseStudentNames(text) -> string[]`, `disambiguate(names) -> string[]`, `validatePassage(reading) -> {ready, problems: string[]}`, `pickIndex(poolSize, rand?) -> int`, `reduce(state, action) -> state`.
  - `state = {phase:'spin'|'selected'|'question'|'revealed'|'completed', questionIndex, questionCount, students:[{id,name,isActive}], selectedStudentId}`
  - `action = {type:'SPIN'|'SPIN_AGAIN', winnerId}` or `{type:'KEEP'|'REMOVE'|'REVEAL'|'NEXT'|'RESTORE'}`.

- [ ] **Step 1: Write the failing tests** in `tests/logic.test.js`

```js
const test = require('node:test');
const assert = require('node:assert');
const Logic = require('../src/logic.js');

test('parseStudentNames: trims, drops blanks, keeps duplicates', function () {
  assert.deepStrictEqual(Logic.parseStudentNames(' An \n\n Bình\nAn\n  Bình  \nChi '),
    ['An', 'Bình', 'An', 'Bình', 'Chi']);
});

test('disambiguate: labels repeats with (2),(3) only when duplicated', function () {
  assert.deepStrictEqual(Logic.disambiguate(['An', 'An', 'An', 'Chi']), ['An (1)', 'An (2)', 'An (3)', 'Chi']);
});

test('containedIn: rejects a range crossing the outer edge', function () {
  const outer = { startOffset: 10, endOffset: 20 };
  assert.strictEqual(Logic.containedIn({ startOffset: 12, endOffset: 18 }, outer), true);
  assert.strictEqual(Logic.containedIn({ startOffset: 8, endOffset: 18 }, outer), false);
  assert.strictEqual(Logic.containedIn({ startOffset: 12, endOffset: 22 }, outer), false);
});

test('mergeRanges: merges overlapping AND adjacent, keeps disjoint sorted', function () {
  assert.deepStrictEqual(
    Logic.mergeRanges([{ startOffset: 5, endOffset: 10 }, { startOffset: 10, endOffset: 12 }, { startOffset: 0, endOffset: 3 }]),
    [{ startOffset: 0, endOffset: 3 }, { startOffset: 5, endOffset: 12 }]);
});

test('validRange: half-open bounds inside content', function () {
  assert.strictEqual(Logic.validRange({ startOffset: 0, endOffset: 3 }, 'abcd'), true);
  assert.strictEqual(Logic.validRange({ startOffset: 2, endOffset: 2 }, 'abcd'), false);
  assert.strictEqual(Logic.validRange({ startOffset: 0, endOffset: 5 }, 'abcd'), false);
});

test('validatePassage: ready only with support + key evidence inside it', function () {
  const base = {
    title: 'T', content: 'Hello world',
    questions: [{ prompt: 'Q', correctOptionId: 'a',
      options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }],
      supportingPassage: { startOffset: 0, endOffset: 11 },
      keyEvidence: [{ startOffset: 0, endOffset: 5 }] }]
  };
  assert.strictEqual(Logic.validatePassage(base).ready, true);

  const noKey = JSON.parse(JSON.stringify(base));
  noKey.questions[0].keyEvidence = [];
  assert.strictEqual(Logic.validatePassage(noKey).ready, false);

  const keyOutside = JSON.parse(JSON.stringify(base));
  keyOutside.questions[0].supportingPassage = { startOffset: 6, endOffset: 11 };
  assert.strictEqual(Logic.validatePassage(keyOutside).ready, false);
});

test('pickIndex: uniform range and -1 when empty', function () {
  assert.strictEqual(Logic.pickIndex(3, function () { return 0; }), 0);
  assert.strictEqual(Logic.pickIndex(3, function () { return 0.999; }), 2);
  assert.strictEqual(Logic.pickIndex(0), -1);
});

test('reduce: keep vs remove roster effect, and no reveal before REVEAL', function () {
  const s0 = { phase: 'spin', questionIndex: 0, questionCount: 2, selectedStudentId: null,
    students: [{ id: 'a', name: 'A', isActive: true }, { id: 'b', name: 'B', isActive: true }] };

  const sel = Logic.reduce(s0, { type: 'SPIN', winnerId: 'a' });
  assert.strictEqual(sel.phase, 'selected');
  assert.strictEqual(sel.selectedStudentId, 'a');

  assert.strictEqual(Logic.reduce(sel, { type: 'REVEAL' }).phase, 'selected'); // ignored in 'selected'
  const kept = Logic.reduce(sel, { type: 'KEEP' });
  assert.strictEqual(kept.phase, 'question');
  assert.ok(kept.students.every(function (x) { return x.isActive; })); // keep changes nothing

  const removed = Logic.reduce(sel, { type: 'REMOVE' });
  assert.strictEqual(removed.students.find(function (x) { return x.id === 'a'; }).isActive, false);

  const revealed = Logic.reduce(kept, { type: 'REVEAL' });
  assert.strictEqual(revealed.phase, 'revealed');
  const next = Logic.reduce(revealed, { type: 'NEXT' });
  assert.strictEqual(next.phase, 'spin');
  assert.strictEqual(next.questionIndex, 1);
  assert.strictEqual(next.selectedStudentId, null);

  const last = { phase: 'revealed', questionIndex: 1, questionCount: 2, selectedStudentId: 'b', students: s0.students };
  assert.strictEqual(Logic.reduce(last, { type: 'NEXT' }).phase, 'completed');
});

test('reduce: RESTORE reactivates everyone without moving the question', function () {
  const s = { phase: 'spin', questionIndex: 1, questionCount: 2, selectedStudentId: null,
    students: [{ id: 'a', name: 'A', isActive: false }, { id: 'b', name: 'B', isActive: true }] };
  const r = Logic.reduce(s, { type: 'RESTORE' });
  assert.ok(r.students.every(function (x) { return x.isActive; }));
  assert.strictEqual(r.questionIndex, 1);
});
```

- [ ] **Step 2: Run tests to verify current state**

Run: `node --test tests/logic.test.js`
Expected: the `parseStudentNames` / `disambiguate` / `containedIn` / `reduce` tests must exist and PASS against the drafted `src/logic.js`. If any fail, fix `src/logic.js` (not the test) until green — the assertions encode SPEC v2.0.

- [ ] **Step 3: Commit**

```bash
git add src/logic.js tests/logic.test.js
git commit -m "feat(logic): v2.0 model — two-level ranges, keep/remove machine"
```

---

### Task 2: Page shell and design tokens

**Files:**
- Modify: `index.html` (all four areas; static markup, no behaviour)
- Modify: `styles.css` (add UI_SPEC §2 tokens; keep existing control/panel classes)

**Interfaces:**
- Produces: the DOM id contract every later task uses. Views: `view-library`, `view-editor`, `view-teaching`.
  - Library: `lib-search`, `passage-list`, `library-empty`, `btn-create`.
  - Editor: `btn-editor-back`, `btn-editor-save`, `btn-editor-teach`, `ed-title`, `btn-mode-edit`, `btn-mode-mark`, `ed-content` (textarea), `passage-preview` (rendered), `btn-set-support`, `btn-key-evidence`, `btn-clear-support`, `btn-clear-keys`, `ed-error`, `question-tabs`, `btn-add-question`, `q-prompt`, `q-options`, `btn-add-option`, `q-evidence`, `btn-move-up`, `btn-move-down`, `btn-delete-question`, `ed-status`, `ed-valid`.
  - Teaching: `btn-teach-exit`, `teach-progress`, `teach-setup`, `teach-students`, `teach-count`, `setup-error`, `btn-start-session`, `teach-session`, `stage-spin`, `wheel-wrap`, `btn-spin`, `spin-roster`, `spin-empty`, `btn-restore`, `stage-selected`, `sel-name`, `btn-keep`, `btn-remove`, `btn-spin-again`, `stage-question`, `teach-passage`, `teach-student`, `teach-question`, `btn-reveal`, `btn-next`, `stage-done`, `done-count`, `btn-teach-again`, `btn-back-library`; header `btn-fullscreen`.
- Reuse existing classes: `.panel`, `.field`, `.ghost`, `.small`, `.danger`, `.badge.ready/.draft`, `.passage`, `.empty`.

- [ ] **Step 1: Rewrite `index.html`** with the id contract above; buttons `type="button"`; static English copy exactly as UI_SPEC §9 (`My Readings`, `Create Reading`, `Search readings...`, `Reading Editor`, `Save Reading`, `Start Teaching`, `Set Supporting Passage`, `Highlight Key Evidence`, `Student Names`, `Enter student names, one per line...`, `Start Session`, `Spin`, `You're up!`, `Keep`, `Remove`, `Spin Again`, `Reveal Answer`, `Next Question`, `Finish Lesson`, `Full Screen`, `Exit Lesson`, `Lesson Complete!`, `Teach Again`, `Back to My Readings`, `Restore All Students`, `No students left on the wheel`). Stage containers start `hidden`.

- [ ] **Step 2: Extend `styles.css`** with UI_SPEC §2.1 tokens (`--color-support:#FFF1B8`, `--color-key:#F7AD4A`, `--color-key-text:#593707`, `--color-correct-bg:#DDF6E6`, `--color-correct-text:#175C38`) and rules:
  - `.passage .mark-support { background: var(--color-support); }` (level 1, soft)
  - `.passage .mark-key { background: var(--color-key); color: var(--color-key-text); font-weight: 700; }` (level 2, stronger)
  - `.teach-options li.correct` uses the correct tokens **plus** a `Correct Answer` label (never colour alone).
  - `.wheel` sizing, `.wheel-rotor { transform-box: fill-box; transform-origin: center; }`, a top pointer, and `.wheel-label` text size.
  Keep the existing `@media (prefers-reduced-motion: reduce)` block.

- [ ] **Step 3: Verify by inspection** — open `index.html` in a browser (`npx serve .`): all four areas exist, are hidden except library, no console errors from missing ids. (Behaviour arrives in Tasks 3–5.)

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat(ui): page shell + evidence design tokens"
```

---

### Task 3: Library + Editor basics (LIB, EDT-01..06, QST)

**Files:**
- Modify: `src/app.js` (replace old file entirely)
- Test: manual AC-01, AC-02, AC-09, AC-10 (SPEC §10)

**Interfaces:**
- Consumes: `Logic.*` (Task 1), DOM ids (Task 2).
- Produces (used by Tasks 4–5): module state `editing = {reading, questionIndex, mode, dirty, baselineContent}`; helpers `clone`, `newReading`, `newQuestion`, `newOption`, `showView(name)`, `renderLibrary()`, `openEditor(id)`, `renderEditor()`, `renderQuestionForm()`, `renderPreview()`, `markDirty()`, `updateValidity()`, `saveEditor()`, `reconcileContent()`; storage key `readingflow.readings.v1`.

- [ ] **Step 1: Implement storage + model helpers** (`loadReadings`, `persist`, `clone`, `newReading`, `newQuestion`, `newOption`, reorder helpers keeping `order` == index).

- [ ] **Step 2: Implement `renderLibrary()`** — one `.passage-item` per reading with title, `N questions`, `toLocaleDateString(updatedAt)`, badge `Ready to teach` / `Draft` from `Logic.validatePassage`, buttons **Start Teaching** (disabled + `title` = joined `problems` when not ready), **Edit**, **Delete** (confirm `Delete this reading? This action cannot be undone.`). Empty state copy from UI_SPEC §9. Wire `lib-search` to filter by title.

- [ ] **Step 3: Implement the editor passage + question form** — `btn-mode-edit` shows `ed-content` textarea; `btn-mode-mark` shows `passage-preview`. `q-prompt`, dynamic `q-options` rows (radio sets `correctOptionId`, text input, `×` removes and clears `correctOptionId` if it was the correct one), `btn-add-option`, question tabs from `question-tabs`, `btn-add-question`, `btn-move-up`/`btn-move-down`/`btn-delete-question`.

- [ ] **Step 4: Implement `markDirty` / `updateValidity` / `saveEditor`** — `ed-valid` shows `Ready to teach` or `Draft — missing: <problems>`; Save writes `updatedAt`, upserts into `readings`, persists, sets `ed-status` = `Reading saved`.

- [ ] **Step 5: Implement `reconcileContent()`** (SPEC §6.5) — if `reading.content` differs from `baselineContent` and any question has evidence: `confirm('Editing this passage will clear the existing evidence highlights. Continue?')`; Cancel reverts `content` to baseline; Continue clears **every** question's `supportingPassage`+`keyEvidence` and updates baseline. Call it on Save and on switching to **Mark Evidence** mode.

  `shortcut: single flat confirm() dialogs (MVP); upgrade to in-app modal if UI_SPEC §5 ConfirmDialog is built.`

- [ ] **Step 6: Verify (manual)** — AC-01 (multi-paragraph paste persists via library → Edit), AC-02 (2- and 5-option questions; one correct), AC-09 (draft saves, Start Teaching disabled with reason), AC-10 (blank lines/extra spaces parsed, count correct).

- [ ] **Step 7: Commit**

```bash
git add src/app.js
git commit -m "feat(app): library + passage/question editor"
```

---

### Task 4: Two-level evidence (EVD-01..13)

**Files:**
- Modify: `src/app.js`
- Test: manual AC-03, AC-04, AC-05, AC-06, AC-08 (SPEC §10)

**Interfaces:**
- Consumes: `Logic.validRange/containedIn/mergeRanges`; `editing`, `renderPreview`, `reconcileContent`.
- Produces: `renderPassage(container, content, support, keys)` (shared with Task 5), `selectionOffsets()`, `setSupportingPassage()`, `addKeyEvidence()`, `removeKeyEvidence(range)`, `clearSupport()`, `clearKeyEvidence()`.

- [ ] **Step 1: Implement `renderPassage(container, content, support, keys)`** — walk sorted boundaries (0, length, support edges, each key edge); emit a `<mark class="mark-key">` where the run is inside a key range, `<mark class="mark-support">` where inside support only, else a text node. Concatenated `container.textContent` must equal `content` exactly (offsets depend on this).

- [ ] **Step 2: Implement `selectionOffsets()`** — from `window.getSelection()`; require both ends inside `passage-preview`; compute start as `pre.toString().length` over `selectNodeContents(container)` and end as start + range text length; return `null` when empty/outside.

- [ ] **Step 3: Implement supporting passage** — `btn-set-support` (enabled when a valid selection exists) stores the range on the active question; if one already exists, `confirm('Changing the Supporting Passage will remove its Key Evidence highlights. Continue?')` then clear `keyEvidence`. `btn-clear-support` clears support + keys.

- [ ] **Step 4: Implement key evidence** — `btn-key-evidence` (enabled only when a selection is fully `containedIn` the support; otherwise show `Select a phrase inside the Supporting Passage.` in `ed-error`) appends then `Logic.mergeRanges(...)` the question's `keyEvidence`. Clicking a `mark-key` removes that exact range; `btn-clear-keys` removes all.

- [ ] **Step 5: Per-question isolation** — `renderPreview()` always paints only the active question's ranges; changing tabs re-renders. `q-evidence` shows `Supporting Passage selected` / `N key evidence highlights`, and enables `btn-clear-support` / `btn-clear-keys`.

- [ ] **Step 6: Verify (manual)** — AC-03 (only Q1 excerpt styled while Q1 active), AC-04 (two key phrases stronger than their excerpt), AC-05 (outside-support selection rejected with the English message), AC-06 (Q1/Q2 show only their own evidence), AC-08 (edit annotated passage → warn → all evidence cleared).

- [ ] **Step 7: Commit**

```bash
git add src/app.js
git commit -m "feat(evidence): two-level per-question highlighting"
```

---

### Task 5: Teaching setup, wheel and session player (SET, SPN, TCH)

**Files:**
- Modify: `src/app.js`
- Test: manual AC-11..AC-19 (SPEC §10)

**Interfaces:**
- Consumes: `Logic.parseStudentNames/disambiguate/pickIndex/reduce/validatePassage`, `renderPassage`.
- Produces: `session = {reading, names, labels, state, spinning, spinToken}`; `beginTeaching(id)`, `startSession()`, `renderSession()`, `renderSpinStage()`, `renderSelectedStage()`, `renderQuestionStage(revealed)`, `buildWheelSVG(students)`, `spin()`, `labelFor(id)`.

- [ ] **Step 1: Setup** — `btn-create`/library **Start Teaching** call `beginTeaching(id)` which validates (alert with `problems` if not ready), clones the reading, and shows the setup panel. `teach-students` input updates `teach-count` (`N students`) and enables `btn-start-session` when `parseStudentNames` returns ≥ 1, else `setup-error` = `Add at least one student to start.`

- [ ] **Step 2: Start session** — build `state` from `Logic.reduce` shape: `{phase:'spin', questionIndex:0, questionCount:questions.length, students: names.map(n => ({id: Logic.newId(), name:n, isActive:true})), selectedStudentId:null}`; `labels = Logic.disambiguate(names)`.

- [ ] **Step 3: `renderSession()`** — toggle `stage-*` by `state.phase`; `teach-progress` = `Question X of Y`. `stage-spin`: `renderSpinStage()` (roster count, disable Spin + show `spin-empty` + `btn-restore` when 0 active). `stage-selected`: `sel-name` = `labelFor(selectedStudentId)` + `You're up!` + Keep/Remove/Spin Again. `stage-question`/`revealed`: `renderQuestionStage(revealed)`.

- [ ] **Step 4: `renderQuestionStage(revealed)`** — `teach-student` = label; `renderPassage(teach-passage, content, revealed?support:null, revealed?keys:[])`; options list with the correct one getting `.correct` + a `Correct Answer` label only when `revealed`; toggle `btn-reveal` vs `btn-next` (text `Next Question` or `Finish Lesson` on the last question).

- [ ] **Step 5: Wheel** — `buildWheelSVG(students)` = SVG with one sector per active student (palette: `#168FA4,#53B8E8,#F47768,#F4C95D,#66BD8A,#A997DF,#F7AD4A`), labels when N ≤ 12, group `#wheel-rotor`. `spin()` picks `Logic.pickIndex(active.length)`, rotates the rotor ~3s to land the winner under the top pointer (skip rotation when `prefers-reduced-motion`), then `state = Logic.reduce(state, {type:'SPIN', winnerId})` and re-render. Guard with `spinning` + `spinToken`. `btn-spin-again` fires `SPIN_AGAIN`.

- [ ] **Step 6: Wire actions** — `btn-keep`→`KEEP`, `btn-remove`→`REMOVE`, `btn-reveal`→`REVEAL`, `btn-next`→`NEXT`, `btn-restore`→`RESTORE`; all through `Logic.reduce` then `renderSession()`.

- [ ] **Step 7: Completion + exit** — `stage-done`: `done-count` = `You've finished all N questions.`, `btn-teach-again` returns to setup with `teach-students` prefilled from `session.names` and `state = null`, `btn-back-library` returns to the library. `btn-teach-exit` confirms when `state && phase !== 'completed'`; `btn-fullscreen` toggles `document.documentElement.requestFullscreen`.

- [ ] **Step 8: Verify (manual)** — AC-11 (Keep stays eligible), AC-12 (Remove excluded from later spins), AC-13 (Spin Again re-rolls, roster unchanged), AC-14 (all removed → Spin disabled + Restore), AC-15 (pre-reveal: no correct styling, no evidence), AC-16 (Reveal: one correct option + only that question's two levels), AC-17 (Next: +1, wheel returns, hidden), AC-18 (final → Lesson Complete with both actions), AC-19 (full screen readable).

- [ ] **Step 9: Commit**

```bash
git add src/app.js
git commit -m "feat(teaching): setup, keep/remove wheel, session player"
```

---

### Task 6: Whole-suite verification

**Files:** none (verification only).

- [ ] **Step 1:** `node --test tests/logic.test.js` → all pass.
- [ ] **Step 2:** Walk AC-01..AC-20 (SPEC §10) in a browser via `npx serve .`; record any failure back into the owning task.
- [ ] **Step 3:** Grep every literal string in `index.html`/`src/app.js` for non-English UI copy (AC-20).
- [ ] **Step 4:** Re-run `gitnexus analyze` (repo was not indexed) before using graph navigation, then `ponytail-review` the diff.

---

## Self-Review (author)

- **Spec coverage:** LIB→T3; EDT→T3; QST→T3; EVD→T4; SET/SPN→T5; TCH→T5; §5 validation→T1 (logic) + T3 (`ed-valid`); §6.5 invalidation→T3 (Step 5); §7 state machine→T1 (`reduce`) + T5; §9 copy→T2; AC-01..20→T3/T4/T5/T6. No gap.
- **Step scan:** each step names the function/id and the spec value; no bodies transcribed beyond the locked `reduce` contract and the wheel palette.
- **Type consistency:** `supportingPassage`/`keyEvidence`/`correctOptionId`/`prompt`/`text` used identically in T1, T3, T4, T5; `renderPassage(container, content, support, keys)` defined once in T4 and reused in T5.
- **Review Focus:** all five lines carry a Task-1 test or a named AC check.
- **Proportion:** ~6 tasks for a 4-area app; code appears only where the spec pins exact values (tests, palette).
