# Stacked Teaching Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the teaching screen a single stacked column — reading passage full width on top, question and answer options below, with the Reveal/Next action bar pinned to the bottom of the viewport — then bring `UI_SPEC` in line with it.

**Architecture:** Presentation only. The two panels inside `#stage-question` become a one-column stack and the action row becomes a sibling of both panels (a sticky element cannot leave its containing block, so inside the question panel it would not pin while a long passage is read). One CSS restructure plus one HTML reorder; `src/app.js` and all ids are untouched. `MVP_SPEC` needs no change because `TCH-03` specifies content, not layout.

**Tech Stack:** vanilla HTML/CSS, no build; `node --test` for logic; Playwright/Edge sweep outside the repo.

**Spec:** `docs/superpowers/specs/2026-11-10-teach-layout-stacked-design.md`

## Global Constraints

- No id may be added, removed or renamed in `index.html`; `src/app.js` must not be modified.
- The teaching passage is capped only by `main`'s 1120px content width — do not widen or narrow `main`.
- `Reveal Answer` / `Next Question` must stay inside the viewport at all times on the teaching screen, including while a long passage is scrolled.
- The editor screen keeps its two-column desktop grid.
- English-only UI copy (AC-20); this change adds no copy.
- Evidence rules are untouched: nothing visible before Reveal Answer.

## Review Focus

- A passage long enough to scroll: does the action bar stay pinned at the bottom of the viewport, or does it drift off screen? — Task 1 (layout check) + manual long-passage look.
- A passage whose paragraph is very long: does the stacked panel stay inside the content width, or does `max-content` sizing blow the panel out sideways? — Task 1 (`#stage-question { display: block }` + width check).
- A short passage: does the bar still look like a normal action row (not a floating slab over empty space)? — Task 1 (screenshot).
- Question 2 of 3 and later: does the bar remain visible after Next Question re-renders the stage? — Task 1 (check after the Next Question click).
- Narrow viewport (<768px, and <940px where the editor collapses): the teaching layout must still stack without horizontal scroll — Task 1 (width check at 375px in a second context, or a `page.set_viewport_size` pass).

---

### Task 1: Stacked layout with a pinned action bar

**Files:**
- Modify: `index.html:174-188` (`#stage-question`)
- Modify: `styles.css:309` (`.passage-big`), `styles.css:411-415` (`.teach-grid`), `styles.css:455-462` (`.teach-actions`), `styles.css:550` (responsive rule)
- Test: `C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: a `.teach-stack` wrapper inside `#stage-question`, with `.panel` (passage), `.panel` (student + question) and `.teach-actions` as its three children, in that order. `src/app.js` keeps filling `#teach-passage`, `#teach-student`, `#teach-question` by id, exactly as before.

- [ ] **Step 1: Write the failing browser checks**

In `rf_e2e.py`, in the Q1 teaching section, immediately after the existing line
`check(page.is_visible("#stage-question"), "Remove moves to the question")` add:

```python
    # ---- layout: passage full width above the question, action bar reachable ----
    box_p = page.locator("#teach-passage").bounding_box()
    box_q = page.locator("#teach-question").bounding_box()
    box_a = page.locator("#btn-reveal").bounding_box()
    content_w = page.evaluate("document.querySelector('main').clientWidth")
    check(box_q["y"] > box_p["y"] + box_p["height"] - 1,
          "layout: the question sits below the passage", (box_p["y"], box_p["height"], box_q["y"]))
    check(box_p["width"] >= content_w * 0.9,
          "layout: the passage spans the content width", (box_p["width"], content_w))
    check(box_a["y"] + box_a["height"] <= 1000,
          "layout: the action bar is inside the viewport", (box_a["y"], box_a["height"]))
```

then add a second look at the layout after the stage re-renders for Q2 — inside the existing Q2 block, between `page.click("#btn-remove")` / `page.wait_for_timeout(150)` and `page.click("#btn-reveal")` (the roster and progress flow already expects exactly one spin + remove there, so do not add a second spin):

```python
    # ---- layout survives the stage being re-rendered for the next question ----
    q2_p = page.locator("#teach-passage").bounding_box()
    q2_a = page.locator("#btn-reveal").bounding_box()
    check(q2_p["width"] >= content_w * 0.9 and q2_a["y"] + q2_a["height"] <= 1000,
          "layout: full-width passage and reachable bar on the next question", (q2_p["width"], q2_a["y"]))
```

Run it against the current code (serve the repo with `python -m http.server 8765 --bind 127.0.0.1`, then
`python C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py`).
Expected: FAIL on "layout: the question sits below the passage" (the question panel is beside, not below) and on "layout: the passage spans the content width" (~685px vs ~1064px). The "action bar inside the viewport" check may already pass — that is fine, the other two are the ones that must go red first.

- [ ] **Step 2: Reorder `index.html`**

Replace the `#stage-question` block with:

```html
        <!-- TCH-02 / TCH-03: question, before and after reveal -->
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

- [ ] **Step 3: Restyle `styles.css`**

- `styles.css:309` → `.passage-big { font-size: 1.34rem; line-height: 1.85; max-width: none; }`
- `styles.css:411-415` → replace `.teach-grid { ... }` with:

```css
/* Bố cục dạy học xếp dọc: đoạn văn full width, hàng nút dính đáy khung nhìn. */
.teach-stack { display: grid; gap: 20px; }
#stage-question { display: block; }
```

- `styles.css:455-462` `.teach-actions`: keep the existing declarations and add `position: sticky; bottom: 0; z-index: 1; background: var(--surface); padding-bottom: 12px;`
- `styles.css:550` → `.editor-grid, .teach-grid { ... }` becomes `.editor-grid { grid-template-columns: 1fr; }` (the teaching stack has no columns left; the editor keeps collapsing).

- [ ] **Step 4: Static checks**

Run: `Select-String -Path styles.css,index.html -Pattern "teach-grid"`
Expected: no hits.
Run: `Select-String -Path src\app.js -Pattern "teach-stack|teach-grid"`
Expected: no hits (`app.js` only knows ids).
Run: `git diff --stat src/app.js`
Expected: empty — `app.js` must not be modified.

- [ ] **Step 5: Run the sweep**

Run: `python C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py`
Expected: every check passes, including the four new layout checks, with 0 console/page errors.

- [ ] **Step 6: Look at it**

Start the static server, capture the teaching screen before and after reveal with `python C:\Users\ASUS\AppData\Local\Temp\opencode\rf_shot.py` (or the equivalent screenshot step), and confirm on the image: passage full width on top, question and options below it, action bar at the bottom edge, no horizontal overflow. Then confirm the reported limitation honestly if the passage is short enough that the bar does not visibly pin.

- [ ] **Step 7: Long-passage spot check**

In the browser, edit the reading to a passage of ~40 lines, save, start a teaching session, and confirm the action bar stays at the bottom of the viewport while the passage scrolls. Record in the commit message or reply what was observed.

- [ ] **Step 8: Commit**

```bash
git add index.html styles.css
git commit -m "feat(teaching): full-width passage with the question below and a pinned action bar"
```

---

### Task 2: Source-of-truth documents

**Files:**
- Modify: `docs/UI_SPEC.md` (§4.5 layout + wireframe + rules, §4.6 layout reference, responsive table)
- Modify: `docs/MVP_SPEC.md` (only if a stale layout statement is found — `TCH-03` itself specifies no layout)

**Interfaces:**
- Consumes: the layout shipped in Task 1.
- Produces: no code.

- [ ] **Step 1: `UI_SPEC` §4.5 (`TCH-02`)**

Replace the "Desktop split view ..." paragraph at line 427 with a stacked description:

```
Desktop stacked layout: the full-width reading passage sits on top, the active question beneath it:

- Top (full content width): **Reading Passage** in a calm, white panel; full original text, generous line spacing, page-scrolled for long readings.
- Below it: selected student name, the question, and visible answer options.
- Bottom of the viewport: one large primary button **Reveal Answer**, in a bar pinned to the viewport edge so it never scrolls away.
```

Replace the wireframe at lines 433-446 with:

```text
┌──────────────────────────────────────────────────────────────┐
│ Question 1 of 5                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ READING PASSAGE                                          │ │
│ │ Anna wanted to visit the park...                         │ │
│ │ However, it was raining heavily, so she decided...       │ │
│ │ [ordinary unhighlighted text]                            │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Emma Johnson                                                 │
│ Why did Anna stay at home?                                   │
│ ○ She felt tired.   ○ It was raining heavily.   ○ She forgot… │
├──────────────────────────────────────────────────────────────┤
│                                         [   Reveal Answer  ] │
└──────────────────────────────────────────────────────────────┘
```

In the Rules list at lines 448-456, line 455 (`For long passages, allow independent reading-pane scrolling without moving action buttons off screen.`) becomes:

```
- For long passages the page scrolls; the action bar stays pinned to the bottom of the viewport.
```

- [ ] **Step 2: `UI_SPEC` §4.6 and the responsive table**

- §4.6 line 469: `in the reading panel` → `in the full-width passage panel at the top`.
- Responsive table line 568: `| >= 1200 px | Two-column Editor and Teaching Question layout; library 2-3 cards across. |` → `| >= 1200 px | Two-column Editor layout; stacked Teaching Question layout with a pinned action bar; library 2-3 cards across. |`
- Line 569: `| 768-1199 px | Two-column where practical; narrower question panel; possible stacked editor sections on tablet portrait. |` → `| 768-1199 px | Two-column where practical (Editor); stacked Teaching Question layout; possible stacked editor sections on tablet portrait. |`
- Line 572: `On smaller viewports, prioritize working functionality over trying to preserve the desktop split at unreadable widths.` → `On smaller viewports, prioritize working functionality over trying to preserve the two-column editor at unreadable widths. The teaching question is stacked at every width.`

- [ ] **Step 3: Prove the docs no longer contradict the code**

Run: `Select-String -Path docs\UI_SPEC.md -Pattern "Desktop split view|narrower question panel|reading-pane scrolling"`
Expected: no hits.
Run: `Select-String -Path docs\UI_SPEC.md -Pattern "pinned action bar"`
Expected: at least one hit.
Run: `Select-String -Path docs\MVP_SPEC.md -Pattern "TCH-03" -Context 0,1`
Expected: content-only wording; if it does mention a two-column layout, fix that line in the same commit.

- [ ] **Step 4: Re-run the tests and the sweep**

Run: `node --test tests/logic.test.js` → `# pass 11`, `# fail 0`.
Run: `python C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py` → all checks pass, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add docs/UI_SPEC.md docs/MVP_SPEC.md
git commit -m "docs: stacked teaching layout with a pinned action bar"
```

## Self-review

1. **Spec coverage:** design doc's HTML reorder → Task 1 Step 2; CSS restructure → Step 3; sweep checks → Step 1; long-passage look → Step 7; UI_SPEC §4.5/§4.6/responsive → Task 2; "MVP_SPEC: no change unless stale" → Task 2 Step 3.
2. **Step scan:** each step is one edit or one command with a checkable result; the only judgment left is the Q2 insertion point in Step 1, which names what to do if the roster/progress state does not fit.
3. **Type consistency:** `.teach-stack` is used in the HTML (Step 2) and the CSS (Step 3); `.teach-grid` disappears from both plus the responsive rule; every id in the new markup matches the ids the sweep and `app.js` already use (`teach-passage`, `teach-student`, `teach-question`, `btn-reveal`, `btn-next`).
4. **Review Focus:** each of the five risks has a check — long passage (Step 7), long paragraph width (Step 1 width check), short passage look (Step 6), next question re-render (Step 1 second block), narrow viewport (Step 5 sweep, plus Step 6 image at a narrow width if the sweep runs at 1440 only).
5. **Proportion:** two tasks, mostly deletions in CSS and one HTML reorder, plus doc lines.
