# Setup Wheel Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teaching Setup (`SET-01`) becomes two columns — a narrower name-entry form on the left and a decorative, continuously rotating wheel preview on the right — then bring `UI_SPEC` in line with it.

**Architecture:** Presentation only. One new static `<div>` in `index.html`, one CSS grid for `.setup`, and one line in `updateSetup()` that redraws the existing SVG wheel into the preview slot. `buildWheelSVG` gains an optional `container` argument and reads a student's display label from `st.label` when the caller supplies one (the setup screen has no session, so `labelFor` cannot resolve names there). The animation lives on the slot, not on the SVG's `.wheel-rotor`, because the SVG is rebuilt on every keystroke — rotating the slot keeps the spin continuous instead of restarting at 0° per character. `MVP_SPEC` needs no change: `SET-01`/AC-10 specify name entry and counting, not layout.

**Tech Stack:** vanilla HTML/CSS, no build; `node --test` for logic; Playwright/Edge sweep outside the repo.

**Spec:** `docs/superpowers/specs/2026-11-10-setup-wheel-preview-design.md`

## Global Constraints

- No id may be added, removed or renamed in `index.html`; `src/app.js` is modified only inside `updateSetup` and `buildWheelSVG`.
- The preview must never look like a result: no pointer, no highlighted or selected name, `aria-hidden="true"`.
- No new library and no second drawing routine — `buildWheelSVG` is reused.
- Evidence rules, session behaviour, name parsing and counting are untouched.
- English-only UI copy (AC-20); this change adds no copy.
- `prefers-reduced-motion` keeps working through the existing global block (`styles.css:562`); no new CSS is needed for it.

## Review Focus

- Every keystroke: does the wheel keep spinning smoothly, or does the rotation jump back to 0° when the SVG is redrawn? — Task 1 (animation on `#setup-wheel`, not on `.wheel-rotor`).
- Empty field: does the screen open with a drawn (grey) wheel, not an empty gap? — Task 1 (check before typing).
- Duplicate names: does the preview show `An (1)`/`An (2)`, matching the real spin screen? — Task 1 (label check).
- Narrow viewport (<940px, where the two-column editor collapses): does the form stack above the wheel with no horizontal scroll, and does Start Session stay reachable? — Task 1 (screenshot pass at 375×800).
- Reduced motion: is the preview static? — Task 1 (existing global block, manual spot check).

---

### Task 1: Two-column setup with a spinning wheel preview

**Files:**
- Modify: `index.html:124-136` (`#teach-setup`)
- Modify: `styles.css:399` (`.setup`), `styles.css:550-554` (responsive block)
- Modify: `src/app.js:583-589` (`updateSetup`), `src/app.js:649-707` (`buildWheelSVG`)
- Test: `C:\Users\ASUS\AppData\Local\Temp\opencode\rf_e2e.py`, `C:\Users\ASUS\AppData\Local\Temp\opencode\rf_setup_shot.py`

**Interfaces:**
- Consumes: `Logic.parseStudentNames`, `Logic.disambiguate` (both already used by this screen); `buildWheelSVG` as it exists today.
- Produces: `buildWheelSVG(students, container)` — `container` is optional and defaults to `#wheel-wrap`; a student may carry `label` and it wins over `labelFor(st.id)`. `#setup-wheel` is a `.wheel-slot` div inside `.setup-wheel`, filled by `updateSetup()` on every `input` event and on `beginTeaching()`.

- [ ] **Step 1: Write the failing browser checks**

In `rf_e2e.py`, in the AC-10 section, after
`check(page.inner_text("#teach-title") == "Start Teaching", "setup header copy")` and **before**
`page.fill("#teach-students", ...)`, add the empty-state draw check:

```python
    # ---- SET-01: decorative spinning wheel preview ----
    check(page.locator("#setup-wheel svg").count() == 1,
          "setup preview: drawn as soon as the screen opens")
    check(page.locator("#setup-wheel circle").count() == 1,
          "setup preview: empty list shows the grey disc")
    check(page.get_attribute(".setup-wheel", "aria-hidden") == "true",
          "setup preview: hidden from screen readers")
```

then after `check(not page.is_disabled("#btn-start-session"), "AC-10: Start Session enabled")` add:

```python
    check(page.locator("#setup-wheel text").count() == 4,
          "setup preview: one label per parsed name", page.locator("#setup-wheel text").count())
    labels = page.eval_on_selector_all("#setup-wheel text", "els => els.map(e => e.textContent)")
    check("An (1)" in labels and "An (2)" in labels,
          "setup preview: duplicates disambiguated like the spin screen", labels)
    check(page.evaluate("getComputedStyle(document.getElementById('setup-wheel')).animationName") != "none",
          "setup preview: the wheel spins on its own, no Spin button")
    check(page.locator("#setup-wheel .wheel-pointer").count() == 0
          and page.locator("#teach-setup .wheel-pointer").count() == 0,
          "setup preview: no pointer, never looks like a result")
    check(not page.is_visible("#btn-spin"), "setup preview: no Spin control on the setup screen")
    box_t = page.locator("#teach-students").bounding_box()
    box_w = page.locator(".setup-wheel").bounding_box()
    check(box_w["x"] > box_t["x"] + box_t["width"],
          "setup preview: sits to the right of the name field", (box_t, box_w))
```

- [ ] **Step 2: Confirm RED**

Start the static server (`python -m http.server 8765 --bind 127.0.0.1`, hidden) and run the sweep. Expect the new checks to fail — `#setup-wheel` does not exist yet, so the first check and the `get_attribute`/`bounding_box` calls fail (the `bounding_box` on a missing `.setup-wheel` raises; wrap it by confirming RED on the first failing check and re-running after the HTML lands, as in the previous task).

- [ ] **Step 3: Restructure the markup**

In `index.html`, wrap the existing form children in `.setup-form` and append the preview:

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

- [ ] **Step 4: Lay it out and animate it**

In `styles.css`, replace `.setup { max-width: 700px; }` with:

```css
/* Hai cột: ô nhập tên bên trái, wheel preview tự quay bên phải. */
.setup {
  max-width: 1000px;
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 28px;
  align-items: start;
}
.setup-wheel {
  width: min(340px, 100%);
  aspect-ratio: 1;
  justify-self: center;
}
/* Vòng quay đặt trên khung chứa, không trên SVG: SVG bị dựng lại mỗi lần gõ tên. */
#setup-wheel { animation: setup-wheel-spin 20s linear infinite; }
@keyframes setup-wheel-spin { to { transform: rotate(360deg); } }
```

and in the `@media (max-width: 940px)` block add:

```css
  .setup { display: block; }
  .setup-wheel { margin-top: 22px; }
```

- [ ] **Step 5: Draw the preview**

In `src/app.js`, `updateSetup()` — append:

```js
    buildWheelSVG(Logic.disambiguate(names).map(function (n) { return { label: n }; }),
      el('setup-wheel'));
```

and in `buildWheelSVG(students)` — take the container and resolve the label:

```js
  function buildWheelSVG(students, container) {
    const slot = container || el('wheel-wrap');
    ...
    function nameOf(st) { return st.label != null ? st.label : labelFor(st.id); }
```

replacing the two `labelFor(students[0].id)` / `labelFor(st.id)` calls with `nameOf(students[0])` / `nameOf(st)`.

- [ ] **Step 6: Confirm GREEN**

Re-run the sweep: 88 + 13 checks, 0 failed, 0 console errors. Run `node --test tests/logic.test.js` (11/11) and `node --check src/app.js`.

- [ ] **Step 7: Screenshots + narrow-width look**

Write `rf_setup_shot.py` (dev-only, outside the repo): open Teaching Setup for a reading, screenshot at 1440×1000, then `page.set_viewport_size({"width": 375, "height": 800})` and report `document.documentElement.scrollWidth > window.innerWidth` (must be False) plus whether `.setup-wheel` is below `#teach-students` and `#btn-start-session` is reachable. Read the images.

- [ ] **Step 8: Commit**

```bash
git add index.html styles.css src/app.js
git commit -m "feat(setup): two-column name entry with a decorative spinning wheel preview"
```

---

### Task 2: Document the preview

**Files:**
- Modify: `docs/UI_SPEC.md` §4.3 (Structure, Layout principles), §5 (`StudentWheel` row), §6.2 (reduced motion), §7.1 (breakpoint row for SET-01 if it names the setup layout)
- Test: none (docs) — verify with grep and the existing suites.

**Interfaces:**
- Consumes: the shipped behaviour and class names from Task 1.
- Produces: prose only.

- [ ] **Step 1: §4.3 Structure**

Add after the "Primary CTA" bullet:

```markdown
- Right column: a decorative wheel **preview** of the entered names, slowly rotating with no pointer and no selected name; it is not the teaching wheel and never shows a result.
```

- [ ] **Step 2: §4.3 Layout principles**

Replace `Center the form with max width around 640–760 px.` with:

```markdown
- Two columns above 940 px: the name form on the left (roughly 45–55%) and the wheel preview (~340 px) on the right; centered as a pair with max width around 1000 px.
- The preview follows typing: it redraws as names are added or removed, including duplicate disambiguation like `Alex Kim (2)`. An empty list shows a plain grey disc.
- Below 940 px the form stacks above the preview.
```

- [ ] **Step 3: §5 component table**

Replace the `StudentWheel` row with two rows so the decorative preview has a name of its own:

```markdown
| `StudentWheel` | Random outcome, animated spin, selected result, current roster awareness. |
| `SetupWheelPreview` | Decorative only, on Teaching Setup: continuously rotating, one segment per entered name, no pointer, no selected name, updates while typing, static under reduced motion. |
```

- [ ] **Step 4: §6.2 reduced motion**

Add a bullet:

```markdown
- The Teaching Setup wheel preview stops animating and shows a static wheel.
```

- [ ] **Step 5: Verify and commit**

Grep `docs/UI_SPEC.md` for stale setup wording (`max width around 640`, `Center the form`) — none expected. Re-run `node --test tests/logic.test.js` and the sweep (docs do not affect them, but keep the gate). Commit:

```bash
git add docs/UI_SPEC.md
git commit -m "docs: setup wheel preview and the two-column name entry"
```
