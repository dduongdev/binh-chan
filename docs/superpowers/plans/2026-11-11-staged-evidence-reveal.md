# Staged Evidence Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split teaching reveal into three teacher-controlled steps: answer, then excerpt, then Key Evidence.

**Architecture:** The session reducer gains explicit phases `answer`, `excerpt`, and `evidence` between `question` and the next spin. The teaching renderer maps each phase to what is visible and to one primary advance button, so the excerpt and evidence cannot appear early.

**Tech Stack:** Vanilla HTML/CSS/JS, `node --test` for the pure reducer, Playwright/Edge sweep outside the repo.

**Spec:** `docs/superpowers/specs/2026-11-11-staged-evidence-reveal-design.md`

## Global Constraints

- Vanilla JS only; no framework, bundler, build step, backend, or network dependency.
- All UI copy is English.
- No storage schema or key change; `readingflow.readings.v2` stays, `readingflow.readings.v1` is still ignored and never migrated or deleted.
- Key Evidence remains optional; zero highlights must not block Ready or teaching.
- Session state stays in memory only.
- Never show the excerpt, correct option, or evidence before its own step.
- One dominant action at a time; no extra on-screen teacher prompts.
- Follow the existing code style: ES5-style functions in `app.js`, pure reducer in `logic.js`.

## Review Focus

- A question with zero Key Evidence must skip the evidence step and offer **Next Question** / **Finish Lesson** as soon as the excerpt is visible.
- Rapid or repeated clicks must not skip a step; the reducer ignores actions sent from the wrong phase.
- The final question must complete from the evidence step, or from the excerpt step when there is no evidence; it must not return to the wheel.
- No correct-answer styling before **Reveal Answer**, and no excerpt text in the DOM during the answer step.
- **Next Question** must reset the new question to the question step, with excerpt and evidence hidden.

---

### Task 1: Session reducer phases

**Files:**
- Modify: `src/logic.js:129-167`
- Modify: `tests/logic.test.js:120-145`

**Interfaces:**
- Consumes: existing `reduce(state, action)` signature.
- Produces: phases `question | answer | excerpt | evidence | completed` and actions `REVEAL_ANSWER`, `SHOW_EXCERPT`, `SHOW_EVIDENCE`, `NEXT`.
- Produces: `NEXT` accepted in `excerpt` and `evidence`; `NEXT` from `excerpt` exists for the no-evidence path.

- [ ] **Step 1: Update the reducer tests for the staged reveal**

Replace the existing `reduce: keep vs remove roster effect, and no reveal before REVEAL` test body with:

```js
test('reduce: keep vs remove roster effect, and staged reveal', function () {
  const s0 = { phase: 'spin', questionIndex: 0, questionCount: 2, selectedStudentId: null,
    students: [{ id: 'a', name: 'A', isActive: true }, { id: 'b', name: 'B', isActive: true }] };

  const sel = Logic.reduce(s0, { type: 'SPIN', winnerId: 'a' });
  assert.strictEqual(sel.phase, 'selected');
  assert.strictEqual(sel.selectedStudentId, 'a');

  assert.strictEqual(Logic.reduce(sel, { type: 'REVEAL_ANSWER' }).phase, 'selected'); // ignored
  const kept = Logic.reduce(sel, { type: 'KEEP' });
  assert.strictEqual(kept.phase, 'question');
  assert.ok(kept.students.every(function (x) { return x.isActive; }));

  const removed = Logic.reduce(sel, { type: 'REMOVE' });
  assert.strictEqual(removed.students.find(function (x) { return x.id === 'a'; }).isActive, false);

  assert.strictEqual(Logic.reduce(kept, { type: 'SHOW_EXCERPT' }).phase, 'question'); // ignored
  const answered = Logic.reduce(kept, { type: 'REVEAL_ANSWER' });
  assert.strictEqual(answered.phase, 'answer');
  assert.strictEqual(Logic.reduce(answered, { type: 'NEXT' }).phase, 'answer'); // ignored
  assert.strictEqual(Logic.reduce(answered, { type: 'SHOW_EVIDENCE' }).phase, 'answer'); // ignored

  const excerpt = Logic.reduce(answered, { type: 'SHOW_EXCERPT' });
  assert.strictEqual(excerpt.phase, 'excerpt');
  assert.strictEqual(Logic.reduce(excerpt, { type: 'REVEAL_ANSWER' }).phase, 'excerpt'); // ignored

  const evidence = Logic.reduce(excerpt, { type: 'SHOW_EVIDENCE' });
  assert.strictEqual(evidence.phase, 'evidence');
  const next = Logic.reduce(evidence, { type: 'NEXT' });
  assert.strictEqual(next.phase, 'spin');
  assert.strictEqual(next.questionIndex, 1);
  assert.strictEqual(next.selectedStudentId, null);

  const last = { phase: 'evidence', questionIndex: 1, questionCount: 2, selectedStudentId: 'b', students: s0.students };
  assert.strictEqual(Logic.reduce(last, { type: 'NEXT' }).phase, 'completed');
});
```

Add this test after it:

```js
test('reduce: NEXT from excerpt is the no-evidence path', function () {
  const s = { phase: 'excerpt', questionIndex: 0, questionCount: 2, selectedStudentId: 'a', students: [] };
  const next = Logic.reduce(s, { type: 'NEXT' });
  assert.strictEqual(next.phase, 'spin');
  assert.strictEqual(next.questionIndex, 1);
  assert.strictEqual(next.selectedStudentId, null);

  const last = { phase: 'excerpt', questionIndex: 1, questionCount: 2, selectedStudentId: 'a', students: [] };
  assert.strictEqual(Logic.reduce(last, { type: 'NEXT' }).phase, 'completed');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/logic.test.js`
Expected: FAIL — `REVEAL_ANSWER` is not handled; the phase stays `question`.

- [ ] **Step 3: Implement the reducer transitions**

In `src/logic.js`, replace the `REVEAL` case with:

```js
case 'REVEAL_ANSWER':
  if (s.phase !== 'question') return s;
  return Object.assign({}, s, { phase: 'answer' });
case 'SHOW_EXCERPT':
  if (s.phase !== 'answer') return s;
  return Object.assign({}, s, { phase: 'excerpt' });
case 'SHOW_EVIDENCE':
  if (s.phase !== 'excerpt') return s;
  return Object.assign({}, s, { phase: 'evidence' });
```

Change the `NEXT` guard to accept both terminal reveal phases:

```js
case 'NEXT':
  if (s.phase !== 'excerpt' && s.phase !== 'evidence') return s;
  if (s.questionIndex >= s.questionCount - 1) return Object.assign({}, s, { phase: 'completed' });
  return Object.assign({}, s, { phase: 'spin', questionIndex: s.questionIndex + 1, selectedStudentId: null });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/logic.test.js`
Expected: PASS, 12 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/logic.js tests/logic.test.js
git commit -m "feat(teaching): add staged reveal phases to session reducer"
```

---

### Task 2: Teaching screen, docs, and browser sweep

**Files:**
- Modify: `src/app.js:577-591`, `src/app.js:706-737`, `src/app.js:818`
- Modify: `index.html:189` (remove `ghost` from `#btn-next`)
- Modify: `docs/MVP_SPEC.md` (v2.4)
- Modify: `docs/UI_SPEC.md` (v1.3)
- Modify: `AGENTS.md`
- Modify: `C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py` (dev-only sweep outside the repo)

**Interfaces:**
- Consumes: phases and actions from Task 1.
- Produces: `renderQuestionStage(phase)` where `phase` is one of `question`, `answer`, `excerpt`, `evidence`.
- Produces: `#btn-reveal` advances the current step; `#btn-next` is visible only in `excerpt` without evidence and in `evidence`.

- [ ] **Step 1: Route the new phases in `renderSession`**

Change stage visibility and rendering to:

```js
el('stage-question').hidden = s.phase !== 'question' && s.phase !== 'answer'
  && s.phase !== 'excerpt' && s.phase !== 'evidence';
...
else if (s.phase === 'question' || s.phase === 'answer'
  || s.phase === 'excerpt' || s.phase === 'evidence') renderQuestionStage(s.phase);
```

- [ ] **Step 2: Render the stage by phase**

Replace the body rules in `renderQuestionStage(revealed)` with `renderQuestionStage(phase)`, deriving:

```js
const answered = phase === 'answer' || phase === 'excerpt' || phase === 'evidence';
const excerptVisible = phase === 'excerpt' || phase === 'evidence';
const evidenceVisible = phase === 'evidence';
el('teach-excerpt-panel').hidden = !excerptVisible;
renderPassage(el('teach-passage'), excerptVisible ? (q.passage || '') : '',
  evidenceVisible ? q.keyEvidence : []);
```

Use `answered` where the old code used `revealed` for the correct-option styling. For the actions:

```js
const hasEvidence = (q.keyEvidence || []).length > 0;
el('btn-reveal').hidden = (phase === 'excerpt' && !hasEvidence) || phase === 'evidence';
el('btn-reveal').textContent = phase === 'question' ? 'Reveal Answer'
  : phase === 'answer' ? 'Show Excerpt' : 'Show Key Evidence';
el('btn-next').hidden = !((phase === 'excerpt' && !hasEvidence) || phase === 'evidence');
el('btn-next').textContent = s.questionIndex >= s.questionCount - 1 ? 'Finish Lesson' : 'Next Question';
```

- [ ] **Step 3: Dispatch the advance action from `#btn-reveal`**

Replace the `REVEAL` listener with:

```js
el('btn-reveal').addEventListener('click', function () {
  const phase = session.state.phase;
  if (phase === 'question') applyAction({ type: 'REVEAL_ANSWER' });
  else if (phase === 'answer') applyAction({ type: 'SHOW_EXCERPT' });
  else if (phase === 'excerpt') applyAction({ type: 'SHOW_EVIDENCE' });
});
```

Keep the `#btn-next` listener unchanged.

- [ ] **Step 4: Make the final action primary**

In `index.html`, change `<button id="btn-next" class="ghost" type="button" hidden>` to `<button id="btn-next" type="button" hidden>`. The final action is the only visible button, so it should not look secondary.

- [ ] **Step 5: Run unit tests**

Run: `node --test tests/logic.test.js`
Expected: PASS, 12 tests, 0 failures.

- [ ] **Step 6: Update the browser sweep**

In `rf_e2e.py`, replace the current question-stage checks with this sequence for Q1:

1. After **Remove**, assert `#teach-excerpt-panel` is hidden, `#teach-passage` is empty, no `li.correct`, and `#btn-reveal` reads **Reveal Answer**.
2. Click `#btn-reveal`; assert exactly one `li.correct`, `#teach-excerpt-panel` still hidden, `#btn-reveal` reads **Show Excerpt**, and `#btn-next` is hidden.
3. Click `#btn-reveal`; assert `#teach-excerpt-panel` visible, `#teach-passage` text equals `EXC1`, `#teach-passage mark` count is `0`, and `#btn-reveal` reads **Show Key Evidence**.
4. Click `#btn-reveal`; assert one `.mark-key` with text `KEY1` and `#btn-next` visible as **Next Question**.
5. Click `#btn-next`; assert Q2 starts with the excerpt panel hidden and empty, ready for **Reveal Answer**.

Repeat the same four-step sequence for Q2 with `EXC2`/`KEY2`. For Q3 (no highlights), after **Show Excerpt** assert the panel is visible, `mark-key` count is `0`, `#btn-reveal` is hidden, and `#btn-next` reads **Finish Lesson**. Keep the existing wheel, AC-08, AC-09, layout, and English-only checks; update any old assertion that expected the excerpt at the answer step.

- [ ] **Step 7: Run the sweep**

Run: `python C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py`
Expected: all checks pass, `0 failed`, no console/page errors.

- [ ] **Step 8: Update `MVP_SPEC.md` to v2.4**

- Bump version/date.
- TCH-03: after Keep/Remove show student, question, options; excerpt hidden.
- TCH-04: no excerpt, correct styling, or evidence before its step.
- TCH-05: **Reveal Answer** shows only the correct option.
- TCH-06: **Show Excerpt** shows the current excerpt plain; **Show Key Evidence** adds only the current question's ranges.
- TCH-07: **Next Question** is available from evidence, or from excerpt when the question has no Key Evidence; reset to spin.
- Replace the §7 `revealed` phase row with `answer`, `excerpt`, `evidence` rows and their teacher actions.
- Update Scenario B to the three clicks and the AC-15/16/17 expectations; keep AC-18 completion.

- [ ] **Step 9: Update `UI_SPEC.md` to v1.3**

- Keep §4.5 as the question-only screen.
- Rewrite §4.6 as **Staged Reveal**: answer step (excerpt hidden), excerpt step (plain), evidence step (marks).
- Exact button copy: **Reveal Answer**, **Show Excerpt**, **Show Key Evidence**, **Next Question**, **Finish Lesson**.
- Update the navigation map, screenshot manifest (TCH-03A/B/C), and the visual checklist so no excerpt is expected before **Show Excerpt** and no marks before **Show Key Evidence**.
- State that a question with no Key Evidence shows **Next Question** / **Finish Lesson** at the excerpt step.

- [ ] **Step 10: Update `AGENTS.md`**

- Bump the spec reference to v2.4.
- Change the primary flow to: question → **Reveal Answer** → **Show Excerpt** → **Show Key Evidence** → Next.
- Replace the “no excerpt/answer/evidence before Reveal Answer” invariant with the staged rule: each layer appears only at its own step.

- [ ] **Step 11: Visual check and commit**

Run `python C:\Users\ASUS\AppData\Local\Temp\opencode\rf_shots.py` and inspect four screenshots: question, answer, excerpt, evidence. Confirm no layout shift breaks the pinned action bar and the final button is primary.

```bash
git add src/app.js index.html docs/MVP_SPEC.md docs/UI_SPEC.md AGENTS.md
git commit -m "feat(teaching): reveal answer, excerpt, and evidence in steps"
```
