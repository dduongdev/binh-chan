# Independent Key Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Key Evidence selectable anywhere in the passage and the Supporting Passage optional, then update the three source-of-truth documents so the repo agrees with the code.

**Architecture:** Two pure-logic edits (`validatePassage`, `passageSegments`) carry the behavior, so the DOM layer only loses its support checks and the now-impossible error path. Docs (MVP_SPEC v2.1, UI_SPEC §4.2.C, AGENTS.md §3) are updated in their own task because they are the project's authority, not commentary.

**Tech Stack:** vanilla JS, no build; `node --test` for logic; Playwright/Edge sweep outside the repo.

**Spec:** `docs/superpowers/specs/2026-11-10-independent-key-evidence-design.md`

## Global Constraints

- Key Evidence ranges stay half-open `[startOffset, endOffset)` over the canonical `content`; offsets come from the DOM selection, never `indexOf`.
- Evidence stays per-question and hidden until Reveal Answer (EVD-08, EVD-13, TCH-04).
- English-only UI copy (AC-20).
- No data migration: existing readings keep working; a question with support + key is still valid.
- `supportingPassage` stays at most one contiguous range per question; no multi-range support.
- Teacher input is rendered as text, never `innerHTML`.

## Review Focus

- A question whose only evidence is Key Evidence (no support) must reach Ready and be teachable, including on the teaching screen — Task 1 test + Task 2 sweep.
- Key Evidence outside the Supporting Passage must render with the stronger style on plain text, not be dropped by the segmentation step — Task 1 test.
- Changing or clearing the Supporting Passage must not delete Key Evidence — Task 2 sweep check.
- After removing `#ed-error`, no code may still reference it (a stale lookup would throw on the first evidence interaction) — Task 2 static check.
- Old saved readings (support + key inside it) must still load and render exactly as before — existing sweep checks AC-06/AC-07 re-run.

---

### Task 1: Logic — independent ranges and optional support

**Files:**
- Modify: `src/logic.js` (`validatePassage` ~line 99-126, `passageSegments` ~line 73-98)
- Test: `tests/logic.test.js:28-71`

**Interfaces:**
- Consumes: `validRange(range, content)`, `mergeRanges(ranges)`, `containedIn(inner, outer)` — unchanged.
- Produces: `validatePassage(p)` still returns `{ ready, problems }`; `passageSegments(content, support, keys)` still returns `{ startOffset, endOffset, level }[]` with `level` in `'text' | 'support' | 'key'`. Only the accepted inputs widen.

- [ ] **Step 1: Write the failing tests**

In `tests/logic.test.js`, replace the "key outside is ignored" block inside the `passageSegments` test with:

```js
  // Key evidence outside the supporting passage is drawn anyway.
  const outside = Logic.passageSegments(content, { startOffset: 6, endOffset: 11 }, [{ startOffset: 0, endOffset: 5 }]);
  assert.deepStrictEqual(outside, [
    { startOffset: 0, endOffset: 5, level: 'key' },
    { startOffset: 5, endOffset: 6, level: 'text' },
    { startOffset: 6, endOffset: 11, level: 'support' }
  ]);

  // No supporting passage at all: key evidence still renders.
  assert.deepStrictEqual(Logic.passageSegments(content, null, [{ startOffset: 0, endOffset: 5 }]), [
    { startOffset: 0, endOffset: 5, level: 'key' },
    { startOffset: 5, endOffset: 11, level: 'text' }
  ]);
```

and replace the `validatePassage` test with:

```js
test('validatePassage: ready with key evidence anywhere, supporting passage optional', function () {
  const base = {
    title: 'T', content: 'Hello world',
    questions: [{ prompt: 'Q', correctOptionId: 'a',
      options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }],
      supportingPassage: null,
      keyEvidence: [{ startOffset: 0, endOffset: 5 }] }]
  };
  assert.strictEqual(Logic.validatePassage(base).ready, true);

  const withSupport = JSON.parse(JSON.stringify(base));
  withSupport.questions[0].supportingPassage = { startOffset: 6, endOffset: 11 };
  assert.strictEqual(Logic.validatePassage(withSupport).ready, true);

  const noKey = JSON.parse(JSON.stringify(base));
  noKey.questions[0].keyEvidence = [];
  assert.strictEqual(Logic.validatePassage(noKey).ready, false);

  const keyOutsideText = JSON.parse(JSON.stringify(base));
  keyOutsideText.questions[0].keyEvidence = [{ startOffset: 0, endOffset: 99 }];
  assert.strictEqual(Logic.validatePassage(keyOutsideText).ready, false);
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `node --test tests/logic.test.js`
Expected: FAIL on both tests — the outside-key segments come back `level: 'text'`, and the no-support reading is `ready: false`.

- [ ] **Step 3: Implement**

In `passageSegments`, keep every valid key range instead of only contained ones:

```js
    const keyRanges = mergeRanges((keys || []).filter(function (r) { return validRange(r, text); }));
```

In `validatePassage`, drop the support requirement and count any valid key range:

```js
      const keys = (q.keyEvidence || []).filter(function (r) { return validRange(r, content); });
      if (keys.length < 1) {
        problems.push('Question ' + n + ' needs at least one key evidence highlight.');
      }
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `node --test tests/logic.test.js`
Expected: `# pass 11`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/logic.js tests/logic.test.js
git commit -m "feat(logic): key evidence independent of supporting passage"
```

---

### Task 2: Editor — no support prerequisite, no cascade, no impossible error

**Files:**
- Modify: `src/app.js` (`updateEvidenceButtons`, `addKeyEvidence`, `setSupportingPassage`, `clearSupport`, `renderPreview`, `renderEvidenceStatus`)
- Modify: `index.html` (remove `#ed-error`)
- Modify: `styles.css` (remove `.evidence-tools .warn`)
- Test: `C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py`

**Interfaces:**
- Consumes: `Logic.validatePassage`, `Logic.mergeRanges`, `Logic.containedIn` (last one no longer used by this file — remove it from the code, not from `logic.js`).
- Produces: no new ids; `#ed-error` is gone, so nothing may look it up.

- [ ] **Step 1: Write the failing browser checks**

In `rf_e2e.py`, replace the AC-05 block (the `select_range` line stays, the two checks that expect the key button disabled and `#ed-error` visible go) with:

```python
    # ---- AC-05: key evidence outside the supporting passage is accepted ----
    page.evaluate("document.getElementById('btn-key-evidence').click()")
    page.wait_for_timeout(150)
    outside_marks = page.locator("#passage-preview .mark-key")
    check(outside_marks.count() == 2, "AC-05: key evidence outside support is saved",
          outside_marks.all_inner_texts())
    check(outside_marks.first.inner_text() == "Anna wanted",
          "AC-05: the outside range keeps the stronger style")
    check(page.evaluate("document.getElementById('ed-error')") is None,
          "error element is gone (no invalid selection exists)")
    outside_marks.first.click()  # remove it again so later checks see one key range
    page.wait_for_timeout(120)
    check(outside_marks.count() == 1, "AC-05: clicking a key range removes it")
```

Then make Question 3 key-only instead of support + key (replacing its `set_evidence(page, SUPPORT3, KEY3)` call):

```python
    page.click("#question-tabs .q-tab >> nth=2")
    page.click("#btn-mode-mark")
    page.wait_for_timeout(100)
    select_range(page, CONTENT.index(KEY3), len(KEY3))
    page.click("#btn-key-evidence")
    page.wait_for_timeout(100)
    check(page.locator("#passage-preview .mark-support").count() == 0,
          "Q3: key evidence without a supporting passage")
```

Right before the save step, add the support-change regression check (Q1 then has a different supporting passage and its key range must survive):

```python
    page.click("#question-tabs .q-tab >> nth=0")
    page.wait_for_timeout(100)
    select_range(page, CONTENT.index(SUPPORT2), len(SUPPORT2))
    page.click("#btn-set-support")
    page.wait_for_timeout(150)
    check(page.locator("#passage-preview .mark-key").count() == 1
          and page.locator("#passage-preview .mark-key").first.inner_text() == KEY1,
          "changing the supporting passage keeps key evidence")
```

After `ready reading enables Start Teaching`, add:

```python
    check("Ready to teach" in page.inner_text("#ed-valid"),
          "a question with key evidence only counts as Ready", page.inner_text("#ed-valid"))
```

In the teaching section, at the Q3 reveal, add:

```python
    check(page.locator("#teach-passage .mark-key").count() >= 1,
          "teaching: key evidence shows without a supporting passage")
    check(page.locator("#teach-passage .mark-support").count() == 0,
          "teaching: no supporting passage means no first-level shading")
```

Run it against the current code:
Start `python -m http.server 8765 --bind 127.0.0.1` in the repo root, then
`python C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py`
Expected: FAIL on "AC-05: key evidence outside support is saved" (button disabled, still 1 mark), on Q3 readiness, and on the support-change check.

- [ ] **Step 2: Let Key Evidence be added anywhere**

In `src/app.js`, `updateEvidenceButtons` becomes:

```js
    el('btn-set-support').disabled = !q || !off;
    el('btn-key-evidence').disabled = !q || !off;
```

(delete the containment branch and its message), and `addKeyEvidence` becomes:

```js
    if (!q || !off || editing.mode !== 'mark') return;
    q.keyEvidence = Logic.mergeRanges(q.keyEvidence.concat([off]));
    window.getSelection().removeAllRanges();
    markDirty();
    renderPreview();
    renderEvidenceStatus();
    updateValidity();
```

- [ ] **Step 3: Stop the cascade and delete the dead error path**

- `setSupportingPassage`: drop the confirm and `q.keyEvidence = []`; keep the early return when the same range is re-selected.
- `clearSupport`: keep `q.supportingPassage = null`, delete `q.keyEvidence = []`, and shorten the confirm to `'Clear the Supporting Passage?'`.
- Delete `showError` and `clearError` functions and their calls (`renderPreview`, `updateEvidenceButtons`, `addKeyEvidence`).
- `renderEvidenceStatus`: the status line becomes
  `p1.textContent = (supportOk ? '\u2713 ' : '') + 'Supporting Passage' + (supportOk ? ' selected' : ' not set (optional)');`
- `index.html`: delete `<p id="ed-error" class="warn" hidden></p>`.
- `styles.css`: delete `.evidence-tools .warn { flex-basis: 100%; }`.

- [ ] **Step 4: Static checks**

Run: `node --check src/app.js` → syntax ok
Run: `node C:\Users\ASUS\AppData\Local\Temp\opencode\rf-check2.js` → `lookups with no element: none`
Run: `node C:\Users\ASUS\AppData\Local\Temp\opencode\rf-lang.js` → no new non-English literals
Expect zero matches for: `Select-String -Path src\app.js,index.html -Pattern "ed-error|showError|clearError|containedIn"`

- [ ] **Step 5: Re-run the sweep**

Run: `python C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py`
Expected: every check passes, no console/page errors (the script prints the total).

- [ ] **Step 6: Commit**

```bash
git add src/app.js index.html styles.css
git commit -m "feat(editor): key evidence independent of supporting passage"
```

---

### Task 3: Source-of-truth documents

**Files:**
- Modify: `docs/MVP_SPEC.md` (version line, §1 flow, §2 glossary, §3.1 flow, §4.4 definitions/EVD table, §5 readiness list, §5.1, §6.2, §6.4, AC-04/05/16)
- Modify: `docs/UI_SPEC.md` (§4.2 goal, §4.2.C, copy table)
- Modify: `AGENTS.md` (§3 invariant bullet, the "9 điều kiện" count, the stale v2.0 status note)

**Interfaces:**
- Consumes: the behavior shipped in Tasks 1-2.
- Produces: no code.

- [ ] **Step 1: MVP_SPEC**

- Line 3: `**Version:** 2.1`
- Line 10: append `v2.1 makes Key Evidence selectable anywhere in the passage and the Supporting Passage optional.`
- Line 22: `select the **key words or phrases** anywhere in the passage that should stand out more strongly, and optionally frame them with a supporting passage.`
- Line 33: `Each question marks stronger key phrases, optionally framed by a broader supporting passage.`
- Lines 58-59: `**Supporting Passage:** one optional contiguous excerpt ...` / `**Key Evidence:** one or more selected word/phrase ranges anywhere in the reading.`
- Line 105: `└─ Mark Key Evidence anywhere in the passage`
- Lines 165-166: mark the Supporting Passage **optional** (first/softer level); Key Evidence is `selected anywhere in the Original Passage` (second/stronger level).
- Line 169: `Each question may have one Supporting Passage region (optional) and zero or more Key Evidence regions while drafting. A question must have at least one Key Evidence region to be ready for teaching.`
- `EVD-04`: `Teachers select words/phrases anywhere in the Original Passage and choose **Highlight Key Evidence**; a Supporting Passage is not required.`
- `EVD-05`: `Key Evidence receives a stronger visual treatment than the surrounding text, and than an overlapping Supporting Passage.`
- `EVD-06`: `A Key Evidence selection must lie within the Original Passage and cannot be zero-length. It need not be inside the Supporting Passage.`
- `EVD-07`: `Teachers can add multiple independent Key Evidence ranges anywhere in the passage.`
- `EVD-11`: `Replacing or clearing the Supporting Passage leaves Key Evidence untouched.`
- §5: delete old rule 7, make rule 7 `Every question has at least one valid Key Evidence range within the Original Passage.` and renumber old rule 9 to 8 (the list becomes 8 rules).
- §5.1: `Key Evidence selections must lie within the Original Passage and cannot be zero-length; they may fall outside the Supporting Passage.`
- §6.2: `supportingPassage` → `TextRange or null — optional first-level excerpt`; `keyEvidence` → `TextRange[] — stronger ranges anywhere in the passage`.
- §6.4 steps 2-3: step 2 becomes `If the question has a Supporting Passage and its evidence is visible, shade it.`; step 3 adds `a key range outside it is drawn on plain text; inside it, on top of the pale background.`
- `AC-04`: `Select two Key Evidence phrases (inside or outside a Supporting Passage).` → `Both stand out more strongly.`
- `AC-05`: `Highlight Key Evidence outside the Supporting Passage.` → `The range is saved and shown with the stronger style.`
- `AC-16`: replace `only that question's two evidence levels appear` with `only that question's evidence appears (Supporting Passage if set, plus Key Evidence)`.

- [ ] **Step 2: UI_SPEC**

- §4.2 goal: `configure every question and its evidence (an optional Supporting Passage plus Key Evidence)`.
- §4.2.C step 1: keep, but the Supporting Passage is optional; step 2 becomes: select words/phrases anywhere in the passage → `Highlight Key Evidence`, which does not require a Supporting Passage.
- "Behavioral safeguards": delete `A teacher cannot highlight Key Evidence until a Supporting Passage is defined.` and `Key Evidence cannot extend outside the Supporting Passage.`; add `Key Evidence may be set anywhere in the passage; the Supporting Passage is optional.` and `Changing or clearing the Supporting Passage leaves Key Evidence untouched.`
- Copy table: replace the `Invalid key selection` row with `Supporting status unset` → `Supporting Passage not set (optional)`.

- [ ] **Step 3: AGENTS.md**

- §3 evidence bullet becomes: Supporting Passage optional (≤ 1 contiguous range per question), Key Evidence required (≥ 1) and allowed anywhere in the passage, stronger style; per-question isolation unchanged.
- §3 last bullet: `đủ 9 điều kiện SPEC §5` → `đủ 8 điều kiện SPEC §5`.
- §2 stale note: change `chưa khớp SPEC v2.0` / `dẫn chứng 2 cấp` wording to state the code now follows SPEC v2.1 (evidence independence), keeping the historical sentence about the old model in past tense.

- [ ] **Step 4: Prove the docs no longer contradict the code**

Run: `Select-String -Path docs\MVP_SPEC.md,docs\UI_SPEC.md,AGENTS.md -Pattern "wholly inside|fully contained|inside the Supporting Passage|cannot highlight|9 điều kiện"`
Expected: no hits.
Run: `Select-String -Path docs\MVP_SPEC.md -Pattern "Version:\*\* 2\.1"`
Expected: one hit.
Run: `node --test tests/logic.test.js` → `# pass 11`, `# fail 0`.
Run the sweep once more → all checks pass.

- [ ] **Step 5: Commit**

```bash
git add docs/MVP_SPEC.md docs/UI_SPEC.md AGENTS.md
git commit -m "docs: v2.1 - key evidence independent, supporting passage optional"
```

## Self-review

1. **Spec coverage:** every changed behavior in the design doc maps to a code task (1, 2) and a document task (3); AC-05/AC-04/AC-16 are rewritten in Task 3 and exercised in Task 2's sweep.
2. **Step scan:** each step is one edit or one command with a checkable result. The only judgment left is wording in docs, pinned by the quoted strings.
3. **Type consistency:** `validatePassage` and `passageSegments` keep their signatures; `level` values unchanged; no id added or renamed except the removal of `#ed-error`.
4. **Review Focus:** each of the five risks has a concrete check in Task 1 or Task 2.
5. **Proportion:** three tasks, mostly deletions (support checks, cascade, error path) plus doc lines; shorter than the design doc.