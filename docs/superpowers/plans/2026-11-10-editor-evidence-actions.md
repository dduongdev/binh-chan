# Editor Evidence Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the four evidence action buttons out of the Reading Passage panel and into the Questions panel, directly under the active question's evidence status.

**Architecture:** Pure markup/CSS move. The buttons keep their ids, so `src/app.js`'s lookup, enable/disable, error and visibility logic works unchanged. A small `Evidence` heading is added above the status block to match UI_SPEC §4.2.

**Tech Stack:** vanilla HTML/CSS/JS, `localStorage`; tests: `node --test` (logic) + a Playwright/Edge acceptance sweep kept outside the repo.

**Spec:** `docs/superpowers/specs/2026-11-10-editor-evidence-actions-design.md`

## Global Constraints

- English-only UI copy (AC-20). Button labels come verbatim from UI_SPEC §9: `Set Supporting Passage`, `Highlight Key Evidence`, `Clear Supporting Passage`, `Clear Key Evidence`.
- Teacher input is rendered as text, never `innerHTML`.
- Evidence is per-question; only the active question's evidence may be visible (EVD-01..13).
- Nothing about the evidence data model, offsets, or selection flow changes.
- `#ed-error` stays the single place invalid-selection messages appear.

## Review Focus

- Clicking a button in the right panel must not clear a text selection made in the left panel (the `mousedown` `preventDefault` guard must keep working after the move) — test in Task 1.
- The action buttons must be hidden in **Edit Passage** mode, while the evidence status stays visible in both modes — test in Task 1.
- The status block must still switch to the newly active question's evidence when tabs change (no stale button state) — covered by the existing sweep checks plus the Task 1 focus check.

---

### Task 1: Relocate the evidence actions under the active question

**Files:**
- Modify: `index.html:63-107` (remove `#evidence-tools` from the passage panel; add `Evidence` heading + tools under `#q-evidence`)
- Modify: `styles.css:363-373` (restyle `.evidence-tools` for the right panel; add `.evidence-head`)
- Test: `C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py` (dev-only script, outside the repo)

**Interfaces:**
- Consumes: ids `evidence-tools`, `btn-set-support`, `btn-key-evidence`, `btn-clear-support`, `btn-clear-keys`, `ed-error`, `q-evidence` — all unchanged, so `src/app.js` needs no edit.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Move the markup**

In `index.html`, delete from the passage panel:

```html
          <div id="evidence-tools" class="evidence-tools" hidden>
            <button id="btn-set-support" class="small" type="button" disabled>Set Supporting Passage</button>
            <button id="btn-key-evidence" class="small" type="button" disabled>Highlight Key Evidence</button>
            <button id="btn-clear-support" class="small ghost" type="button" disabled>Clear Supporting Passage</button>
            <button id="btn-clear-keys" class="small ghost" type="button" disabled>Clear Key Evidence</button>
            <p id="ed-error" class="warn" hidden></p>
          </div>
```

and insert it in the questions panel, immediately after `<div id="q-evidence" class="q-evidence"></div>`, preceded by the heading:

```html
            <h4 class="evidence-head">Evidence</h4>
            <div id="q-evidence" class="q-evidence"></div>

            <div id="evidence-tools" class="evidence-tools" hidden>
              <button id="btn-set-support" class="small" type="button" disabled>Set Supporting Passage</button>
              <button id="btn-key-evidence" class="small" type="button" disabled>Highlight Key Evidence</button>
              <button id="btn-clear-support" class="small ghost" type="button" disabled>Clear Supporting Passage</button>
              <button id="btn-clear-keys" class="small ghost" type="button" disabled>Clear Key Evidence</button>
              <p id="ed-error" class="warn" hidden></p>
            </div>
```

- [ ] **Step 2: Retarget the styles**

In `styles.css`, replace the `.evidence-tools` block (and its stray comment) with a questions-panel version: no top border, no top padding, sits under `#q-evidence`; add the heading rule.

```css
/* ---------------- Evidence status + actions (questions panel) ---------------- */

.evidence-head {
  margin: 0 0 8px;
  font-size: .78rem;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--muted);
}

.evidence-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 16px;
}
.evidence-tools .warn { flex-basis: 100%; }
```

- [ ] **Step 3: Point the hint at the new location**

In `index.html`, change `#ed-hint` body text to name the new location, keeping it one sentence:

```html
          <p id="ed-hint" class="hint panel-note">
            Select text in this passage, then use the evidence actions under the active question.
          </p>
```

- [ ] **Step 4: Check structure and logic**

Run: `node --check src/app.js` → syntax ok
Run: `node C:\Users\ASUS\AppData\Local\Temp\opencode\rf-check2.js` → `lookups with no element: none`
Run: `node --test tests/logic.test.js` → `# pass 11`, `# fail 0`

- [ ] **Step 5: Add the two browser checks and run the sweep**

In `rf_e2e.py`, right after the `AC-04: key evidence painted stronger` check, add:

```python
    where = page.evaluate("""() => {
        const tools = document.getElementById('evidence-tools');
        const qPanel = document.getElementById('q-evidence').parentElement;
        return { insideQuestions: qPanel.contains(tools),
                 heading: document.querySelector('.evidence-head').textContent,
                 visibleInMark: !tools.hidden };
    }""")
    check(where["insideQuestions"], "evidence actions live in the questions panel", where)
    check(where["visibleInMark"], "evidence actions visible in Mark Evidence mode", where)

    page.click("#btn-mode-edit")
    page.wait_for_timeout(120)
    check(page.is_hidden("#evidence-tools") and page.is_visible("#q-evidence"),
          "edit mode hides the actions but keeps the evidence status")
    page.click("#btn-mode-mark")
    page.wait_for_timeout(120)
```

Then run the sweep with the static server up:

Run: `python -m http.server 8765 --bind 127.0.0.1` (background, repo root), then
`python C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py`
Expected: `74 checks, 0 failed` and no console/page errors.

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css
git commit -m "fix(editor): put evidence actions under the active question"
```

## Self-review

1. **Spec coverage:** the design doc's five points map to Steps 1 (move, ids kept), 1+2 (heading), 2 (styles), 3 (hint), 5 (verification). No gaps.
2. **Step scan:** each step is one edit or one command with a checkable result; no placeholder lines.
3. **Type consistency:** no new functions or ids; every id referenced already exists.
4. **Review Focus:** each of the three risks has a check in Step 5 plus the pre-existing sweep.
5. **Proportion:** one task, smaller than the design doc it implements.
