# Per-Question Reading Excerpts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the whole-reading passage: a lesson becomes a title plus questions, each question owns a plain-text excerpt, and Key Evidence is highlighted inside that excerpt as the only evidence level.

**Architecture:** `Reading.content` and `Question.supportingPassage` disappear; `Question.passage` is added. The editor's left panel becomes the active question's excerpt, still with Edit / Mark modes. Evidence offsets are re-based on `question.passage`. Teaching renders the current question's excerpt. Storage moves to a new key so old `v1` data is ignored without migration. The pure offset/validation rules stay in `src/logic.js` behind unit tests; the DOM behaviour is verified by the Playwright sweep.

**Tech Stack:** vanilla HTML/CSS/JS, no build; `node --test` for logic; Playwright/Edge sweep outside the repo.

**Spec:** `docs/superpowers/specs/2026-11-10-question-excerpt-evidence-design.md`

## Global Constraints

- No whole-reading text exists in the model, the editor, the teaching screen, or storage. `Reading.content` is removed from code and docs.
- One evidence level only: **Key Evidence**. `Question.supportingPassage`, `Set Supporting Passage`, `Clear Supporting Passage`, `.mark-support`, and `--color-support` are removed.
- Evidence offsets are half-open `[startOffset, endOffset)`, UTF-16 indices into **that question's** `passage`, derived from the DOM selection — never `indexOf`.
- Remove the two supporting-passage button ids (`btn-set-support`, `btn-clear-support`); every other id in `index.html` stays, and `#ed-excerpt-for`, `#ed-empty` are added.
- Key Evidence is optional for readiness; the excerpt is required.
- Teacher text is rendered with text nodes and `textContent` only — never `innerHTML`.
- All UI copy stays English (AC-20).
- Storage key is `readingflow.readings.v2`. `readingflow.readings.v1` is never read, migrated, or deleted.
- No new dependency, framework, or build step.

## Review Focus

- **Cancel on an edited excerpt:** after typing in a question that has highlights, switching tab / adding a question / saving must ask first; Cancel restores the old text, keeps the highlights, and aborts the action. — Task 1 (sweep cancel-path checks).
- **Switch tabs with different excerpts:** the textarea, preview, sub-label, evidence status, and actions must all follow the new question; no text from the previous question may remain. — Task 1 (sweep).
- **A reading with zero highlights:** title + question + two options + one correct + excerpt must be Ready and Start Teaching enabled. — Task 1 (unit + sweep).
- **Reveal boundary:** before Reveal, the teaching excerpt has no marks and no correct-answer styling; after Reveal, only the current question's Key Evidence appears. — Task 1 (sweep).
- **Old browser data:** a seeded `readingflow.readings.v1` record must not appear, crash, or be overwritten by the new build. — Task 1 (sweep).
- **UTF-16 inside an excerpt:** a selection covering a surrogate pair (emoji) must slice without splitting it. — Task 1 (unit test on `passageSegments`).

---

### Task 1: Per-question excerpts end to end

**Files:**
- Modify: `src/logic.js` (`passageSegments`, `validatePassage`)
- Modify: `src/app.js` (storage key, model constructors, editor, evidence, reconcile, save, teaching, library)
- Modify: `index.html` (left editor panel, evidence tools)
- Modify: `styles.css` (evidence tokens, `.mark-support`, excerpt sub-label, card preview)
- Test: `tests/logic.test.js`
- Test: `C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py` (dev-only, outside the repo)

**Interfaces:**
- Consumes: `Logic.mergeRanges`, `Logic.validRange`, `Logic.newId` (unchanged); all existing editor/session ids except the removed `btn-set-support` / `btn-clear-support`.
- Produces:
  - `Logic.passageSegments(text, keys)` → `{ startOffset, endOffset, level: 'text' | 'key' }[]`.
  - `Logic.validatePassage(reading)` → `{ ready: boolean, problems: string[] }`, with a per-question excerpt rule and no evidence requirement.
  - `Question.passage: string` (`''` when empty); `Question.keyEvidence: { startOffset, endOffset }[]` into that passage.
  - `readingflow.readings.v2` storage key.
  - `renderPassage(container, text, keys)` (three arguments).
  - `editing.baselinePassage: string` and `reconcileExcerpt() → boolean`.

- [ ] **Step 0: Commit the design and plan**

```bash
git add docs/superpowers/specs/2026-11-10-question-excerpt-evidence-design.md docs/superpowers/plans/2026-11-10-question-excerpt-evidence.md
git commit -m "docs: per-question excerpt design + plan"
```

- [ ] **Step 1: Replace the two logic tests with the new contract**

In `tests/logic.test.js`, replace the tests at lines 33-92 (`passageSegments`, `validatePassage`) with:

```js
test('passageSegments: one highlight level, contiguous slices rebuild the excerpt exactly', function () {
  const text = 'Hello world';
  assert.deepStrictEqual(Logic.passageSegments(text, [{ startOffset: 0, endOffset: 5 }]), [
    { startOffset: 0, endOffset: 5, level: 'key' },
    { startOffset: 5, endOffset: 11, level: 'text' }
  ]);
  assert.strictEqual(
    Logic.passageSegments(text, [{ startOffset: 0, endOffset: 5 }])
      .map(function (s) { return text.slice(s.startOffset, s.endOffset); }).join(''),
    text);

  // Overlapping or adjacent highlights merge into one.
  assert.deepStrictEqual(
    Logic.passageSegments(text, [{ startOffset: 0, endOffset: 3 }, { startOffset: 3, endOffset: 5 }]),
    [{ startOffset: 0, endOffset: 5, level: 'key' }, { startOffset: 5, endOffset: 11, level: 'text' }]);

  // Out-of-range ranges are dropped, not clamped.
  assert.deepStrictEqual(Logic.passageSegments('abc', [{ startOffset: 0, endOffset: 9 }]),
    [{ startOffset: 0, endOffset: 3, level: 'text' }]);

  // No highlights -> one text slice.
  assert.deepStrictEqual(Logic.passageSegments('abc', []),
    [{ startOffset: 0, endOffset: 3, level: 'text' }]);

  // UTF-16: a surrogate pair is one 2-code-unit slice, never split.
  const emoji = 'A\u{1F600}B';
  assert.deepStrictEqual(Logic.passageSegments(emoji, [{ startOffset: 1, endOffset: 3 }]), [
    { startOffset: 0, endOffset: 1, level: 'text' },
    { startOffset: 1, endOffset: 3, level: 'key' },
    { startOffset: 3, endOffset: 4, level: 'text' }
  ]);
});

test('validatePassage: excerpt required, key evidence optional', function () {
  function question() {
    return {
      prompt: 'Q', passage: 'Hello world', correctOptionId: 'a',
      options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }],
      keyEvidence: []
    };
  }
  const base = { title: 'T', questions: [question()] };
  assert.strictEqual(Logic.validatePassage(base).ready, true); // no content, no highlights

  const withKey = JSON.parse(JSON.stringify(base));
  withKey.questions[0].keyEvidence = [{ startOffset: 0, endOffset: 5 }];
  assert.strictEqual(Logic.validatePassage(withKey).ready, true);

  const noExcerpt = JSON.parse(JSON.stringify(base));
  noExcerpt.questions[0].passage = '   ';
  const v = Logic.validatePassage(noExcerpt);
  assert.strictEqual(v.ready, false);
  assert.ok(v.problems.some(function (p) { return p.indexOf('reading excerpt') !== -1; }));

  // Invalid ranges are filtered at render time and never block readiness.
  const staleKey = JSON.parse(JSON.stringify(base));
  staleKey.questions[0].keyEvidence = [{ startOffset: 0, endOffset: 99 }];
  assert.strictEqual(Logic.validatePassage(staleKey).ready, true);

  const noTitle = JSON.parse(JSON.stringify(base));
  noTitle.title = '';
  assert.strictEqual(Logic.validatePassage(noTitle).ready, false);
  assert.strictEqual(Logic.validatePassage({ title: 'T', questions: [] }).ready, false);
});
```

- [ ] **Step 2: Confirm RED**

Run: `node --test tests/logic.test.js`
Expected: the two new tests fail — `passageSegments` still takes `(content, support, keys)` and `validatePassage` still requires `content` and one key range.

- [ ] **Step 3: Implement the two logic functions**

In `src/logic.js`, change `passageSegments(content, support, keys)` to `passageSegments(text, keys)`: keep the points/merge loop, drop `inSup`, and emit `level: inKey ? 'key' : 'text'`. Keep the `validRange` filter against the excerpt.

In `validatePassage(p)`, delete the `content` check and the key-evidence requirement; after the correct-answer check add:

```js
      if (!q.passage || !q.passage.trim()) {
        problems.push('Question ' + n + ' has no reading excerpt.');
      }
```

Return `{ ready: problems.length === 0, problems: problems }` as before.

- [ ] **Step 4: Confirm GREEN (no commit yet)**

Run: `node --test tests/logic.test.js`
Expected: `# pass 11`, `# fail 0`.

Do not commit yet — the app must change in the same commit so the tree is never shipped half-migrated. Continue.

- [ ] **Step 5: Storage key and model constructors**

In `src/app.js`:

```js
const STORAGE_KEY = 'readingflow.readings.v2';
```

`newQuestion()` becomes:

```js
  function newQuestion() {
    return {
      id: Logic.newId(), order: 0, prompt: '', passage: '',
      options: [newOption(), newOption()],
      correctOptionId: null,
      keyEvidence: []
    };
  }
```

`newReading()` drops `content`:

```js
    return { id: Logic.newId(), title: '', questions: [], createdAt: Date.now(), updatedAt: Date.now() };
```

Leave `loadReadings()` and `persist()` unchanged except for the constant: v2 is the only key read or written.

- [ ] **Step 6: Rewrite the editor's left panel**

In `index.html`, replace the first `.panel` (lines 54-70) with:

```html
        <div class="panel">
          <div class="panel-head">
            <h3>Reading Excerpt <span id="ed-excerpt-for" class="panel-sub"></span></h3>
            <div class="toolbar">
              <button id="btn-mode-edit" class="small" type="button">Edit Excerpt</button>
              <button id="btn-mode-mark" class="small ghost" type="button">Mark Evidence</button>
            </div>
          </div>

          <p id="ed-empty" class="hint panel-note" hidden>Add a question to write its excerpt.</p>
          <p id="ed-hint" class="hint panel-note" hidden>
            Select text in this excerpt, then use the evidence actions under the active question.
          </p>

          <textarea id="ed-content" rows="14" placeholder="Paste or type this question's excerpt from the book..."></textarea>

          <div id="passage-preview" class="passage passage-edit" hidden></div>
        </div>
```

and replace `#evidence-tools` with:

```html
            <div id="evidence-tools" class="evidence-tools" hidden>
              <button id="btn-key-evidence" class="small" type="button" disabled>Highlight Key Evidence</button>
              <button id="btn-clear-keys" class="small ghost" type="button" disabled>Clear Key Evidence</button>
            </div>
```

- [ ] **Step 7: CSS cleanup and the two new bits**

In `styles.css`:

- Change the evidence token comment to one level and delete `--color-support`.
- Delete `.passage .mark-support { ... }`.
- Add after the panel-head rules:

```css
.panel-sub { font-size: .82rem; font-weight: 600; color: var(--muted); margin-left: 4px; }
```

- Add after `.p-meta`:

```css
.p-preview {
  margin: 4px 0 6px;
  color: var(--ink-2);
  font-size: .9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 8: Editor rendering**

In `src/app.js`:

- `openEditor`: replace `baselineContent: reading.content || ''` with

```js
      baselinePassage: reading.questions.length ? (reading.questions[0].passage || '') : ''
```

- `renderEditor`: bind the textarea and panel to the active question:

```js
    const q = currentQuestion();
    el('ed-title').value = r.title || '';
    el('ed-content').value = q ? (q.passage || '') : '';
    el('ed-content').disabled = !q;
    el('ed-excerpt-for').textContent = q ? '\u00b7 Question ' + (editing.questionIndex + 1) : '';
    el('ed-empty').hidden = !!q;

    const marking = editing.mode === 'mark' && !!q;
    el('ed-content').hidden = marking || !q;
    el('passage-preview').hidden = !marking;
    el('evidence-tools').hidden = !marking;
    el('ed-hint').hidden = !marking;
    el('btn-mode-edit').disabled = !q;
    el('btn-mode-mark').disabled = !q;
```

Keep the existing class swaps for the two mode buttons.

- `renderPreview`: call `renderPassage(el('passage-preview'), q ? (q.passage || '') : '', q ? (q.keyEvidence || []) : [])`.

- `renderPassage(container, content, support, keys)` becomes `renderPassage(container, text, keys)`, drops the `support` argument of `passageSegments`, and deletes the `mark-support` branch (only `'key'` marks are created).

- `renderEvidenceStatus`: keep one status line (drop the Supporting Passage line; keep the `yes` class when the count is above zero):

```js
    p.textContent = (n > 0 ? '\u2713 ' : '') + n + ' Key Evidence highlight' + (n === 1 ? '' : 's');
```

No active question: `Add a question to write an excerpt and mark evidence.`; disable `#btn-clear-keys` and `#btn-key-evidence` when there is no question.

- `updateEvidenceButtons`: enable only `#btn-key-evidence` from the selection.

- Delete `setSupportingPassage()` and `clearSupport()`; keep `addKeyEvidence`, `removeKeyEvidence`, `clearKeyEvidence`. Delete the stale comment above `removeKeyEvidence` that explains slicing across a Supporting Passage boundary.

- [ ] **Step 9: Editor navigation, reconcile, and save**

Add `reconcileExcerpt()` replacing `reconcileContent()`:

```js
  function reconcileExcerpt() {
    if (!editing) return true;
    const q = currentQuestion();
    if (!q || (q.passage || '') === editing.baselinePassage) return true;
    if ((q.keyEvidence || []).length
      && !confirm('Editing this excerpt will clear its evidence highlights. Continue?')) {
      q.passage = editing.baselinePassage;
      el('ed-content').value = editing.baselinePassage;
      updateValidity();
      return false;
    }
    q.keyEvidence = [];
    editing.baselinePassage = q.passage || '';
    markDirty();
    renderPreview();
    renderEvidenceStatus();
    updateValidity();
    return true;
  }
```

Wire it in:

- `selectQuestion(i)`: `if (!reconcileExcerpt()) return;` before changing the index; after changing it, set `editing.baselinePassage = currentQuestion() ? (currentQuestion().passage || '') : ''`, then call `renderEditor()` (which refreshes tabs, form, preview, textarea).
- `addQuestion()`: call `reconcileExcerpt()` first and abort on `false`; then push, set index to the last question, set `mode = 'edit'`, `baselinePassage = ''`, call `renderEditor()`, and focus `#ed-content`.
- `deleteQuestion()`: after the existing confirm/splice/index clamp, set `editing.baselinePassage` from the new active question and call `renderEditor()` instead of the three render calls.
- `moveQuestion(delta)`: leave the baseline untouched (same question object) but call `renderEditor()` after the swap so the panel sub-label follows the new position; the textarea re-binds to the same, unchanged `passage`.
- `setMode(mode)`: require a current question and call `reconcileExcerpt()` before entering Mark.
- `saveEditor()`: replace `reconcileContent()` with `reconcileExcerpt()`.

Replace the `#ed-content` input handler:

```js
    el('ed-content').addEventListener('input', function () {
      const q = currentQuestion();
      if (!q) return;
      q.passage = el('ed-content').value;
      markDirty();
      updateValidity();
    });
```

Event wiring: delete the `btn-set-support` / `btn-clear-support` listeners, and remove both ids from the `mousedown` preventDefault array (keep `btn-key-evidence`). Remove the now-unused `baselineContent` references.

- [ ] **Step 10: Teaching renders the question's excerpt**

In `renderQuestionStage`:

```js
    renderPassage(el('teach-passage'), q.passage || '',
      revealed ? q.keyEvidence : []);
```

Nothing else in the teaching flow changes.

- [ ] **Step 11: Library preview line**

In `renderLibrary`, after the title:

```js
      const first = (r.questions || [])[0];
      const preview = document.createElement('p');
      preview.className = 'p-preview';
      preview.textContent = first && first.passage && first.passage.trim()
        ? first.passage : 'No excerpt yet.';
      info.append(title, preview, meta);
```

(Replace the existing `info.append(title, meta)`.)

- [ ] **Step 12: Static check and unit tests**

Run: `node --check src/app.js`, `node --test tests/logic.test.js`, and

```bash
Select-String -Path src\app.js,src\logic.js -Pattern "supportingPassage|\.content|reconcileContent|mark-support"
```

Expected: no syntax error, `# pass 11`, `# fail 0`, and no stale references (`supportingPassage`, `reconcileContent`, `mark-support`, or `r.content`-style access).

- [ ] **Step 13: Update the browser sweep helpers and fixture data**

In `rf_e2e.py`:

- Replace the single `CONTENT`/`SUPPORT*`/`KEY*` constants with three excerpts, one per question, e.g.:

```python
EXC1 = "Anna wanted to visit the park. However, it was raining heavily, so she stayed home and read a book."
EXC2 = "At home, Anna made a cup of tea and read a book about birds."
EXC3 = "By the evening, the rain stopped and Anna felt happy."
KEY1 = "raining heavily"
KEY2 = "read a book about birds"
```

- Replace `set_evidence(page, support, key)` with:

```python
def set_excerpt(page, text):
    page.click("#btn-mode-edit")
    page.fill("#ed-content", text)
    page.click("#btn-mode-mark")
    page.wait_for_timeout(100)


def add_key(page, excerpt, key):
    if page.is_hidden("#passage-preview"):
        page.click("#btn-mode-mark")
        page.wait_for_timeout(100)
    select_range(page, excerpt.index(key), len(key))
    page.click("#btn-key-evidence")
    page.wait_for_timeout(100)
```

- In fixture creation: after each `add_question(...)`, fill that question's excerpt, then mark its key when the check needs evidence. Question 3 stays highlight-free, proving a question may have none.

- Update the old supporting-passage assertions. Then grep the whole file for `CONTENT`, `SUPPORT1`, `SUPPORT2`, `SUPPORT3`, `set_evidence`, `mark-support`, and `btn-set-support`; every remaining use must be rewritten or removed.
  - The early AC-09 draft check must move to just after the title is entered and before any question exists: with evidence now optional, the completed fixture is Ready, so the old spot no longer proves a draft.
  - `#passage-preview .mark-support` count must be `0` everywhere.
  - `#ed-content` after switching to Q2 must equal `EXC2`; switching back must equal `EXC1`.
  - `#ed-excerpt-for` contains `Question 1` / `Question 2`.
  - Library card `.p-preview` starts with `EXC1`.
  - Teaching before reveal: `#teach-passage` text equals Q1's excerpt and `#teach-passage .mark-key` count is `0`; after reveal: the mark text equals Q1's key.
  - Teaching Q3 (no highlights): its excerpt text still shows and `#teach-passage .mark-key` stays `0` before and after reveal.
  - Save/reopen persists each excerpt and its evidence (AC-01/AC-07).
  - Edit Q1's excerpt, **click Q2's tab**, and accept the dialog; assert Q1's marks are gone while Q2's marks remain (AC-06).
  - Edit Q1's excerpt, click Q2's tab, dismiss the dialog, and assert: still on Q1, old text restored, Q1's marks intact (cancel path).
  - After the AC-06 checks, clear Q2's remaining highlights, save, and assert the reading is still `Ready to teach` and Start Teaching is enabled with zero highlights anywhere (AC-08).
  - The old AC-09 draft check can no longer clear evidence (evidence is optional). Invalidate by emptying Q3's excerpt instead, save, exit, and assert the card is `Draft` with Start Teaching disabled and a reason in its title.
  - Old data: at the start (after `localStorage.clear()`), seed `readingflow.readings.v1` with an old-shape reading carrying a distinctive title, reload, assert the library is empty and the v1 key is still present, then remove the seed and reload to begin the run.

- [ ] **Step 14: Run the sweep and the manual look**

Start the static server (port 8765) and run `python C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py`.
Expected: all checks pass, `0 failed`, no console/page errors.

Take screenshots of the editor with Q1 evidence and of Teaching before/after reveal; read them to confirm the panel shows the excerpt and only one highlight level.

- [ ] **Step 15: Commit**

```bash
git add src/logic.js src/app.js index.html styles.css tests/logic.test.js
git commit -m "feat: per-question reading excerpts with single-level key evidence"
```

---

### Task 2: Rewrite the product specs and agent notes

**Files:**
- Modify: `docs/MVP_SPEC.md`
- Modify: `docs/UI_SPEC.md`
- Modify: `AGENTS.md`
- Test: none (docs) — verify by grep and by re-running the suites.

**Interfaces:**
- Consumes: the shipped model and behaviour from Task 1 (names: `Question.passage`, `keyEvidence`, `Reading Excerpt`, `Highlight Key Evidence`, `Clear Key Evidence`, `readingflow.readings.v2`).
- Produces: prose only.

- [ ] **Step 1: MVP_SPEC introduction and scope (§1-§3)**

- Bump the header to **Version 2.2** and rewrite the supersession note: no whole-reading passage; each question owns an excerpt; one evidence level; the old `v1` browser data is ignored. Keep the existing wheel Keep/Remove sentence.
- §1.1: purpose bullets 1, 3, 6 — create a lesson from a title plus per-question excerpts; mark key words inside the excerpt; reveal only the correct answer and Key Evidence.
- §1.2: replace the "two levels of evidence" principle with one level inside each question's excerpt, and reword "Annotate the original text, not a duplicate" to "Annotate the excerpt itself, not a separate evidence field."
- §2.1: replace "Complete passage input" with per-question excerpt input; rewrite "Question-specific, two-level annotation directly on the passage" as one-level annotation inside each question's excerpt; replace the Supporting Passage bullet with the per-question excerpt; reword the Key Evidence bullet to ranges inside that excerpt.
- §2.2: delete the "multiple Supporting Passage regions" out-of-scope bullet; add "multiple excerpts per question".
- §3.1: `EDT` purpose becomes "Title, per-question excerpts, questions, answers, and Key Evidence."
- §3.2: journey becomes title → add question → paste that question's excerpt → mark Key Evidence inside it → save; the teaching leg shows the excerpt, not the whole passage.

- [ ] **Step 2: MVP_SPEC §4.1-§4.4**

- §4.1 `LIB-01`: the card's preview line comes from the first question's excerpt, not from a whole-reading passage.
- Rename §4.2 from "Reading Editor: entire passage (`EDT`)" to "Reading Editor: title, questions, and excerpts (`EDT`)".
- Replace the `EDT` table with rows covering: title; per-question plain-text excerpt with line breaks; excerpt is the only reading text (no whole-passage field); add/edit/delete/reorder questions; keep drafts while switching questions; save the whole reading; Edit Excerpt / Mark Evidence modes; warn when an annotated excerpt changes. Add `EDT-09` saying the lesson stores and displays no whole-reading passage.

Add `QST-07`: each question has one excerpt shown during teaching.

Rename §4.4 from "Two-level question-specific evidence" to "Question-specific evidence", then replace it with one-level rules:

```markdown
#### Definitions

- **Excerpt:** the plain-text passage a question owns, copied from the book. It is the only reading text stored and shown.
- **Key Evidence:** one or more words or phrases selected inside that question's Excerpt; the stronger highlight. Optional.
- **Current Question:** the question being edited or taught. Only its Excerpt and annotations can appear.

| ID | Requirement |
| --- | --- |
| `EVD-01` | Teachers select a question, then select text directly in that question's Excerpt. |
| `EVD-02` | The **Highlight Key Evidence** action under the active question is enabled for a valid selection. |
| `EVD-03` | The selected region is stored as that question's Key Evidence and shown with the strong style. |
| `EVD-04` | A question may have zero or more Key Evidence ranges; highlighting is optional for readiness. |
| `EVD-05` | Key Evidence receives the strong visual treatment; there is no second, softer level. |
| `EVD-06` | A Key Evidence selection must lie inside the question's Excerpt and cannot be zero-length. |
| `EVD-07` | Teachers can add multiple independent Key Evidence ranges anywhere in the Excerpt. |
| `EVD-08` | Switching questions shows only the current question's Excerpt and its annotations. |
| `EVD-09` | Different questions may quote and highlight the same book text; each holds its own copy. |
| `EVD-10` | Teachers can remove an individual Key Evidence range or clear all key highlights. |
| `EVD-11` | Editing a question's Excerpt clears only that question's highlights, after confirmation (§6.5). |
| `EVD-12` | Teachers type the Excerpt as plain text and select inside it; there is no separate quote field, color picker, or manual offset entry. |
| `EVD-13` | Unrevealed evidence remains hidden in the Teaching Session until **Reveal Answer**. |
```

Example: excerpt = the rainy-afternoon sentences; Key Evidence = `it was raining heavily`; "the rest of the excerpt stays normal text."

- [ ] **Step 3: MVP_SPEC §4.7, §5, §5.1**

- `TCH-03`: show the selected student, the **question's excerpt**, the question, and the options.
- `TCH-04`: before reveal, no correct-answer styling and no evidence highlights.
- `TCH-05`: Reveal identifies the correct option and applies the question's Key Evidence (one level).
- §5 readiness list becomes the six rules: title, at least one question, prompt, two options, one correct, excerpt non-blank. Remove the Original Passage and Key Evidence requirements.
- §5.1: selection must come from the displayed excerpt; ranges must fit that question's excerpt; overlaps merge; half-open UTF-16 offsets; rendering metadata only.

- [ ] **Step 4: MVP_SPEC data model, state machine, scenarios**

- §6.1: remove `content` from `Reading`; add "A reading stores no whole-reading passage."
- §6.2: add `passage: string` (the question's excerpt); remove `supportingPassage`; say `keyEvidence` offsets refer to that `passage`.
- §6.4: offsets refer to the canonical `Question.passage` string; rendering = excerpt, then key spans; no support level.
- §6.5: rewrite as: typing updates the excerpt; leaving Edit mode / switching question / saving compares against the baseline; if changed and highlights exist, confirm **Editing this excerpt will clear its evidence highlights. Continue?**; Cancel restores the old text and keeps the highlights; Continue clears only that question's ranges; no automatic reconciliation.
- §6.6: session snapshot wording becomes "the reading's title and question configuration, including each question's excerpt".
- §6.7: replace the JSON example with a reading that has no `content`, and each question has `passage` plus ranges into it. For the example passage `Anna wanted to visit the park. However, it was raining heavily, so she stayed home.`, the Key Evidence range for `raining heavily` is `{ "startOffset": 47, "endOffset": 62 }`; keep the note that real offsets are computed at runtime.
- §7: the Reveal row says "Correct option + this question's Key Evidence shown"; no Supporting Passage.
- §8 Scenario A: title → add question → paste its excerpt → mark Key Evidence inside it → repeat per question. Scenario B: teaching shows the question's excerpt; after reveal only Key Evidence is emphasized.

- [ ] **Step 5: MVP_SPEC acceptance criteria and tail sections**

- `AC-01`: a multi-paragraph excerpt persists on reopening; no whole-reading field exists.
- `AC-03`: select a phrase in Q1's excerpt; only that range gets the strong style while Q1 is active.
- `AC-04`: two phrases in one excerpt both stand out; overlaps merge.
- `AC-05`: two questions with different excerpts show only their own excerpt and highlights.
- `AC-06`: edit an annotated excerpt and confirm; only that question's highlights clear (this absorbs the old AC-08 modification-warning test).
- `AC-08`: a reading with no highlights is Ready.
- `AC-15`: before Reveal, no correct answer and no evidence.
- `AC-16`: after Reveal, exactly one correct option and only the current question's evidence.
- Keep AC-02/07/09-14/17-20, reading "passage" as "excerpt".
- §11: sequence step 3 = title + per-question excerpts + answers + ordering; step 4 = one-level Key Evidence per excerpt and excerpt invalidation.
- §12: replace "multiple supporting excerpts per question" with "multiple excerpts per question".

- [ ] **Step 6: UI_SPEC principles, tokens, library, editor (§1.3-§4.2)**

- §1.3 rule 3: reword "never retype a quotation as evidence" so it still holds: the excerpt is entered once as reading text, and evidence is selected inside it — no separate quote field.
- §1.3 rule 4: preserve the question's excerpt when marking evidence and when teaching.
- §2.1: delete `--color-support`, the "two levels" comment, and the guidance bullet describing the Supporting Passage as a soft warm overlay; keep `--color-key`.
- §4.1: state that the card preview text comes from the first question's excerpt, and change "two-line passage preview" to a one-line excerpt preview.
- §4.2: rewrite the goal, structure, and sketch for a left **READING EXCERPT · QUESTION N** panel bound to the active question, plus the right questions panel. Section A becomes "Enter a title and each question's excerpt"; no whole-reading input, no "never ask for separate passage text per question". Section B stays. Section C becomes a single-level workflow:
  1. Make a question active, select text in its excerpt.
  2. Click **Highlight Key Evidence**; the range gets the orange-gold/bold style.
  3. Click a highlight to remove it, or **Clear Key Evidence**.
  - Keep: only the current question's evidence is shown; editing an excerpt warns and clears only that question; no color picker or offset fields.
- §4.2 Evidence visual example: one excerpt with only the Key Evidence phrase in orange-gold bold; drop the pale Supporting Passage layer.
- §4.2 Toolbar: replace the warning copy with **Editing this excerpt will clear its evidence highlights. Continue?** and drop the invented **Cancel** / **Continue Editing** button labels (the app uses the native confirm).

- [ ] **Step 7: UI_SPEC teaching, components, long content (§4.5-§5, §6.3, §7.3)**

- §4.5 TCH-02: the top panel is the **current question's Reading Excerpt**, not the full reading; long excerpts page-scroll; no whole-reading view.
- §4.5 Rules: replace "Show the full passage; do not replace it with the excerpt alone" with "Show only the current question's excerpt; there is no full-reading view."
- §4.6 TCH-03: one highlight level; delete the Supporting Passage level and legend pairing; rewrite the Level 0/1/2 hierarchy to excerpt text + Key Evidence + correct answer; after Reveal show the correct answer plus Key Evidence.
- §5: `ReadingTextEditor` → `ExcerptTextEditor` (plain-text excerpt per question, Edit/Mark states); `ReadingEvidenceViewer` shows the active question's excerpt and one-level ranges; `EvidenceActions` = **Highlight Key Evidence** / **Clear Key Evidence**; `ReadingCard` says excerpt preview instead of passage preview; `ConfirmDialog` says excerpt evidence invalidation.
- §6.3: "Changing an annotated passage" becomes "Changing an annotated excerpt" and explains that only that question's ranges clear.
- §7.3: long excerpts scroll; there is no separate full-reading pane.

- [ ] **Step 8: UI_SPEC copy, variants, sample, checklist (§9-§12)**

- §9: `Reading Excerpt` label; placeholder **Paste or type this question's excerpt from the book...**; change the mode label to `Edit Excerpt`; remove every Supporting Passage row; change the invalidation warning to **Editing this excerpt will clear its evidence highlights. Continue?**; change the incomplete-reading reason to **Finish the title, questions, answers, and excerpts before teaching.**; add **Add a question to write its excerpt.**, **Add a question to write an excerpt and mark evidence.**, **Question N has no reading excerpt.**, and **No excerpt yet.**; keep `1 Key Evidence highlight` / `2 Key Evidence highlights`.
- §10: variants 2/3 become active-question excerpt entry and one-level evidence; variants 7/8 show the excerpt, not the full passage.
- §10 sample lesson: rewrite as a title plus three per-question excerpts with their keys; no full passage.
- §11: item 3 selects ranges against each question's saved excerpt (no faked marks); item 4 keeps the editor's excerpt input and annotated view on the same saved text; item 5 says one highlight level, not two.
- §12 checklist: one excerpt per question and no whole-reading field; current question's Key Evidence is the only highlight level; after reveal the correct answer and Key Evidence are distinct; no evidence before reveal.

- [ ] **Step 9: AGENTS.md**

- Preamble: change the source-of-truth version from v2.0 to v2.2.
- §1: main flow becomes title → add question → paste that question's excerpt → mark one-level Key Evidence → teach; the project model is a title plus per-question excerpts, not a whole reading.
- §2: change "Code đã theo SPEC v2.1" to v2.2 and describe the new model: title + per-question excerpt, one-level Key Evidence, storage `readingflow.readings.v2`.
- §3: replace the two-level evidence bullet; replace the `content` offset bullet with `question.passage`; replace the "editing the reading clears every question" bullet with "editing a question's excerpt clears only that question's Key Evidence, after confirmation"; change "đủ 8 điều kiện SPEC §5" to the six current conditions; add that no whole-reading text is stored; keep the no-leak, rotation, Keep/Remove and Start Teaching invariants.

- [ ] **Step 10: Verify and commit**

Run:

```bash
Select-String -Path docs\MVP_SPEC.md,docs\UI_SPEC.md,AGENTS.md -Pattern "supportingPassage|Supporting Passage|Original Passage|Reading\.content|full reading passage|entire reading passage|entire reading|whole reading|full passage|passage preview|two-level|two levels|editing this passage"
```

Expected: no stale requirement text (historical references inside a version note are acceptable only if clearly marked as superseded).

Re-run `node --test tests/logic.test.js` (11/11) and the sweep (all checks, 0 failed). Commit:

```bash
git add docs/MVP_SPEC.md docs/UI_SPEC.md AGENTS.md
git commit -m "docs: per-question excerpts and single-level key evidence (SPEC v2.2)"
```
