# ReadingFlow — UI/UX Design Specification

**Version:** 1.2  
**Status:** Design direction and implementation guidance for MVP  
**Last updated:** November 11, 2026  
**Product language:** **English only**  
**Functional source of truth:** [`MVP_SPEC.md`](./MVP_SPEC.md)  
**Visual inspiration:** [Turtle Diary](https://www.turtlediary.com/)

> Design a friendly, colorful, straightforward educational experience inspired by Turtle Diary's approachable learning activities, colorful category cards, clear labels, and playful interaction patterns. **Do not reproduce Turtle Diary's brand, logo, mascot, graphics, page layouts, wording, or assets.** ReadingFlow must have its own identity and a substantially simpler teacher-oriented workflow.

---

## 1. Design intent

### 1.1 Product personality

**ReadingFlow should feel:**

- **Playful but focused.** Cheerful colors and wheel animation are welcome; distractions are not.
- **Friendly but not childish.** Appropriate for teachers and students across school grades, including older learners.
- **Simple and reassuring.** Each screen answers, “What should I do next?”
- **Readable from a projector.** Large, strong typography and high-contrast actions in the teaching flow.
- **Natural and human-designed.** Thoughtful whitespace, familiar controls, and limited visual ornamentation.

### 1.2 Turtle Diary inspiration: what to adopt and what to avoid

| Adopt the spirit of | Avoid importing |
| --- | --- |
| Colorful, easily distinguished interactive categories. | A busy educational portal with many unrelated destinations. |
| Large, clearly labeled cards and buttons. | Dense menus, banner advertisements, and content carousels. |
| Friendly rounded shapes and accessible illustrations. | Copying the Turtle Diary turtle mascot, logo, or art. |
| Visible feedback when a learner takes an action. | Excessive animation, flashing elements, or competitive scoring. |
| Bright and positive educational tone. | Cluttered neon backgrounds or highly saturated colors everywhere. |

**Design balance:** Use a quiet, light editorial workspace for **Reading Editor** and more energetic, playful presentation elements for **Teaching Session**. The wheel can be colorful; reading text must always remain calm and legible.

### 1.3 Primary usability rules

1. Exactly one dominant primary action per screen or step.
2. No technical terminology visible to teachers: never show “offset,” “range,” “JSON,” “token,” or “annotation ID.”
3. The excerpt is entered once as reading text; evidence is selected inside it, so the teacher never retypes a quotation as a separate evidence field.
4. Preserve the current question's excerpt when marking evidence; in teaching, reveal it only after **Reveal Answer**.
5. Keep student-selection actions explicit: **Keep**, **Remove**, **Spin Again**.
6. Do not reveal the excerpt, answers, or annotations until the teacher chooses **Reveal Answer**.
7. Use consistent, plain English across the entire interface.
8. Prefer inline controls and contextual menus over large modals and side-drawer mazes.
9. Avoid a dashboard with statistics, charts, leaderboards, or unused navigation.

---

## 2. Visual design system

The following are **proposed ReadingFlow design tokens** inspired by the *feel* of the reference site, **not extracted from or claimed to match Turtle Diary's exact brand palette**. Treat these tokens as the initial implementation baseline; adjust only to preserve contrast and consistency.

### 2.1 Colors

| Token | Hex | Purpose |
| --- | --- | --- |
| `--color-primary` | `#168FA4` | Main CTA, active navigation, links. |
| `--color-primary-hover` | `#0C7488` | Primary hover/pressed state. |
| `--color-primary-soft` | `#E0F6F8` | Active tabs, gentle background emphasis. |
| `--color-sky` | `#53B8E8` | Secondary illustration/wheel color. |
| `--color-coral` | `#F47768` | Wheel segment and friendly accents. |
| `--color-sunshine` | `#F4C95D` | Wheel segment and warm accents. |
| `--color-leaf` | `#66BD8A` | Positive accents and wheel segment. |
| `--color-lavender` | `#A997DF` | Wheel segment. |
| `--color-background` | `#F7FAFC` | Application background. |
| `--color-surface` | `#FFFFFF` | Editors, cards, white panels. |
| `--color-text` | `#203548` | Main text and titles. |
| `--color-muted` | `#627588` | Secondary descriptions. |
| `--color-border` | `#DCE6EB` | Quiet borders and input outlines. |
| `--color-key` | `#F7AD4A` | **Key Evidence** highlight. |
| `--color-key-text` | `#593707` | Key Evidence foreground. |
| `--color-correct-bg` | `#DDF6E6` | Correct answer reveal. |
| `--color-correct-text` | `#175C38` | Correct answer text/icon. |
| `--color-danger` | `#C94747` | Destructive actions and validation. |

Color usage rules:

- Use mostly `background`, `surface`, and `text` in the editor.
- Use the colorful palette selectively for the wheel, welcome illustrations, and small accents.
- The **Key Evidence** must be meaningfully stronger: deeper orange background, bold text, and sufficient foreground contrast.
- Correct answers must include a check icon and/or “Correct Answer” label, never green color alone.
- Red is reserved for errors and destructive actions, not ordinary answer choices.

### 2.2 Typography

| Role | Font suggestion | Desktop size | Weight |
| --- | --- | --- | --- |
| Friendly page heading | `Nunito Sans`, fallback `sans-serif` | 30–34 px | 800 |
| Section heading | `Nunito Sans` | 20–24 px | 700 |
| Card heading | `Nunito Sans` | 17–19 px | 700 |
| General UI and inputs | `Inter`, fallback `system-ui` | 15–16 px | 400–600 |
| Reading excerpt (editor) | `Inter` or a highly legible reading typeface | 18 px | 400 |
| Reading excerpt (teaching) | `Inter` | 22–26 px | 400 |
| Question (teaching) | `Nunito Sans` | 25–32 px | 700–800 |
| Wheel selected name | `Nunito Sans` | 32–44 px | 800 |
| Small helper text | `Inter` | 13–14 px | 400–500 |

- Keep reading line height around `1.65–1.8` and avoid excessively wide paragraphs.
- Use sentence case for headings and buttons. Do not use ALL CAPS except for tiny, infrequent utility labels.
- Maintain generous spacing around paragraphs and question options.
- Load fonts efficiently, with readable fallbacks and no layout dependency on a CDN.

### 2.3 Spacing, shapes, and elevation

- Use an 8 px spacing system; common values: `8`, `12`, `16`, `24`, `32`, `40`, `48` px.
- Cards: border radius `16–20 px`, subtle `1 px` border; small shadow only when helpful.
- Buttons: radius `12–14 px`, no pill-shaped control everywhere.
- Inputs: radius `12 px`, minimum 44 px high.
- Teaching CTAs: minimum 52 px high; aim for 56–60 px.
- Card/panel padding: 20–28 px desktop, 16–20 px tablet.
- Shadows: soft, diffused, low opacity. Avoid heavy neumorphism or artificial glass effects.
- Icons: one consistent rounded-outline set, approximately 18–22 px, paired with text on primary actions.

### 2.4 Visual assets

- A small original ReadingFlow book/leaf/speech-bubble mark may appear in the header.
- Illustrations should be sparse, flat, friendly, and original.
- No stock photo banners are needed for a reading lesson application.
- Do not use Turtle Diary's logo, turtle mascot, copyrighted illustrations, or screenshots as shipped product assets.
- Design the wheel natively (SVG or Canvas), not as a pasted image, so student names and spin outcomes are dynamic.

---

## 3. Global layout and navigation

### 3.1 Desktop-first shell

Suggested width characteristics:

- Desktop design reference: **1440 × 900 px**.
- Support common laptops at **1366 × 768 px** and projectors at **1920 × 1080 px**.
- Main content max width: approximately **1320–1440 px**, centered.
- App shell background: very light gray-blue; working surfaces remain white.
- Header height: approximately **64–72 px**.

Header on preparation screens:

```text
[ ReadingFlow logo ]    My Readings                         [optional Help]
```

Keep navigation shallow. No complex sidebar, ten-link mega menu, grade navigation, ads, or unrelated educational categories.

### 3.2 App navigation map

```text
My Readings
  ├── Create Reading → Reading Editor
  ├── Edit Reading   → Reading Editor
  └── Start Teaching → Teaching Setup
                         └── Start Session
                               └── Spin → Selected Student
                                     └── Keep / Remove → Question
                                          └── Reveal Answer (excerpt appears) → Next Question
                                                └── Lesson Complete
```

The **Teaching Session** should use a dedicated classroom canvas: no library cards, no editor tools, minimal top bar, visible progress, and optionally **Full Screen**.

---

## 4. Screen specifications

## 4.1 Screen `LIB-01`: My Readings

### Goal

Allow the teacher to find a reading and either edit it or begin teaching immediately.

### Structure

```text
┌────────────────────────────────────────────────────────────────┐
│ ReadingFlow                                  My Readings       │
├────────────────────────────────────────────────────────────────┤
│ My Readings                                 [+ Create Reading] │
│ Create a lesson once. Use it whenever you teach.              │
│                                                                │
│ [ Search readings...                                      ]    │
│                                                                │
│ ┌───────────────────┐  ┌───────────────────┐                   │
│ │ A Rainy Afternoon │  │ A Day at the Zoo  │                   │
│ │ Excerpt preview...│  │ Excerpt preview...│                   │
│ │ 5 questions       │  │ 3 questions       │                   │
│ │ [Start Teaching]  │  │ [Start Teaching]  │                   │
│ │ Edit  ·  Delete   │  │ Edit  ·  Delete   │                   │
│ └───────────────────┘  └───────────────────┘                   │
└────────────────────────────────────────────────────────────────┘
```

### Content and interaction

- Primary heading: **My Readings**.
- Primary CTA: **Create Reading** (plus icon).
- Optional helper: **Create a lesson once. Use it whenever you teach.**
- Search input: **Search readings...**
- Reading cards: title, one-line preview of the first question's excerpt, `5 questions`, last-updated date.
- Every ready lesson: prominent **Start Teaching** button; small **Edit**, **Delete** actions.
- Drafts: label **Draft**; **Start Teaching** disabled or replaced by **Finish Setup**, with a clear explanation.
- Empty state: modest original book illustration, **No readings yet**, **Create your first reading to get started.**, **Create Reading**.
- Deleting requires a compact confirmation dialog with **Cancel** and **Delete Reading**.

### Visual treatment

- Use friendly rectangular cards with one subtle colored icon/strip, not each card fully saturated.
- Use a 2–3 column grid on wide desktop and 1 column at narrower widths.
- Avoid large statistics, search filters by grade, or game tiles unrelated to actual readings.

---

## 4.2 Screen `EDT-01`: Reading Editor

### Goal

Allow the teacher to enter the reading title and configure every question with **its own reading excerpt**, answer options, and **Key Evidence** inside that excerpt — without moving between unrelated screens.

### Layout

A two-column workspace on desktop:

- **Left: Reading Excerpt (approximately 55–60%)**, bound to the active question.
- **Right: Question Editor (approximately 40–45%)**.
- Each panel can scroll independently if needed; scrolling should not hide critical navigation.
- A slim sticky top action row contains **Back to My Readings**, reading title/status, **Save Reading**, and **Start Teaching** (when ready).

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ ← My Readings    Reading Editor           [Save Reading] [Start Teaching] │
├─────────────────────────────────────┬───────────────────────────────────┤
│ READING EXCERPT · QUESTION 1        │ QUESTIONS                         │
│ [ A Rainy Afternoon             ]   │ [1] [2] [3] [+ Add Question]     │
│ [Edit Excerpt]  [Mark Evidence]     │                                   │
│                                     │ Question 1                        │
│ Anna wanted to visit the park...    │ [Why did Anna stay at home?    ]  │
│ [  It was RAINING HEAVILY ...   ]   │                                   │
│                                     │ ( ) She felt tired.               │
│                                     │ (●) It was raining heavily.       │
│                                     │ ( ) She forgot her bag.          │
│                                     │ [+ Add Option]                    │
│                                     │                                   │
│                                     │ EVIDENCE                          │
│                                     │ 1 Key Evidence highlight          │
└─────────────────────────────────────┴───────────────────────────────────┘
```

### A. Enter a title and each question's excerpt

- Reading title input: **Reading Title** / placeholder **Enter a title...**.
- The left panel edits the **active question's excerpt**. No excerpt input exists until a question is added; show **Add a question to write its excerpt.**
- Excerpt input: a multiline plain-text field with paragraph breaks; **Paste or type this question's excerpt from the book...**.
- The panel heading shows **Reading Excerpt · Question N** so the teacher can see which question they are editing.
- The stored excerpt is the only reading text for that question, used both in the editor and on the teaching screen.
- There is no whole-reading passage field, preview, or stored value.
- Once the teacher has entered an excerpt, they can switch to **Mark Evidence** mode and see clean, selectable text instead of a textarea.
- **Edit Excerpt** mode returns to text entry. If the question already has highlights, changing the text triggers the confirmation described in `MVP_SPEC.md`.

### B. Question editor

- Small numbered question tabs/chips along the top of the right panel; active chip uses a colored background.
- Add question: **Add Question**.
- Active question content field: **Question** / placeholder **Enter your question...**.
- Answer section: **Answer Options** with a dynamically growing list.
- Each option has a radio button for correct answer, text input, and subtle remove icon.
- Helper: **Select the correct answer.**
- Action: **Add Option**.
- Reordering questions: keyboard-accessible **Move Up** / **Move Down** actions in a small overflow menu, or clear drag controls with keyboard alternatives.
- Preserve drafts while changing active questions.
- A small status at the top of the active question shows **Draft** or **Ready**.

### C. The evidence selection workflow

This is the most important Editor interaction.

1. Make a question active; its excerpt appears in the left panel.
2. Switch to **Mark Evidence** and drag to select one or more important words or phrases inside that excerpt.
3. Click **Highlight Key Evidence** from the evidence actions under the current question.
4. On click, emphasize that text with a **strong orange background and bold foreground text**.
5. The question editor shows **1 Key Evidence highlight**, **2 Key Evidence highlights**, etc.
6. Clicking a highlight removes it; **Clear Key Evidence** removes them all.

**Behavioral safeguards**

- Only the current question's excerpt and highlights are shown.
- When the active question changes, the excerpt and visible evidence update to match that question only.
- A phrase used for Question 1 can be reused by Question 2 without any conflict; each question holds its own excerpt.
- Editing an excerpt warns and clears only that question's highlights, after confirmation.
- No color picker, annotation-management screen, separate quote field, or offset fields.
- Highlight color is fixed by role; evidence is not selected via confusing menu categories.

### Evidence visual example

Excerpt for the active question:

> Anna wanted to visit the park. However, it was raining heavily, so she stayed home.

After reveal, or while marking:

- `raining heavily` has an **orange-gold** background and bold type (**Key Evidence**).
- The rest of the excerpt remains normal text.
- The excerpt stays readable, paragraph layout stays intact, and nothing outside this question is highlighted.

### Toolbar and feedback

- Top actions: **Save Reading** (primary while editing), **Start Teaching** (secondary or primary when saved and ready).
- For invalid drafts, keep **Save Reading** available; show contextual missing-field guidance.
- After save: brief non-blocking text **Reading saved**.
- Excerpt modification warning: **Editing this excerpt will clear its evidence highlights. Continue?** The app uses the native confirm (OK / Cancel), so no custom button labels are needed.
- Avoid a large persistent sidebar listing every highlight; lightweight status text is sufficient.

---

## 4.3 Screen `SET-01`: Teaching Setup

### Goal

Prepare a classroom session in one short step, without accounts or class administration.

### Structure

- Top: **Start Teaching** and selected reading title.
- Compact reading summary: **A Rainy Afternoon · 5 questions**.
- Main input: large multiline field labeled **Student Names**.
- Placeholder: **Enter student names, one per line...**.
- Helper text: **Paste a list from a spreadsheet or type names on separate lines.**
- Live counter: **24 students**.
- Primary CTA at bottom: **Start Session**.
- Secondary navigation: **Back**.
- Right half: a decorative wheel **preview** of the entered names, slowly rotating with no pointer and no selected name; it is not the teaching wheel and never shows a result.

### Layout principles

- Two equal halves above 940 px: the name form on the left and the wheel preview on the right, the pair capped at about 1000 px.
- The preview fills its half and is clipped to that column: a rotating square is wider than its own box, and a decorative preview must never add a horizontal scrollbar. The wheel disc is inscribed in the square, so nothing of the wheel itself is cut.
- Hovering the preview pauses it; the preview is static for users who ask for reduced motion.
- The preview follows typing: it redraws as names are added or removed, including duplicate disambiguation like `Alex Kim (2)`. An empty list shows a plain grey disc.
- Below 940 px the form stacks above the preview.
- Use a cheerful, subtle heading graphic or colored icon, not a dense dashboard.
- Trim blank lines quietly; do not present a complex student table.
- Duplicate display names are allowed. If needed, present a subtle distinction such as `Alex Kim (2)` during spinning; never silently discard entries.
- Empty validation: **Add at least one student to start.**

---

## 4.4 Screen `TCH-01`: Spin the Wheel

### Goal

Build a little excitement while helping the teacher choose a student in seconds.

### Main arrangement

- Minimal top bar: reading title, **Question 1 of 5**, **Full Screen**, **Exit Lesson**.
- Center: large, friendly, colorful wheel with clearly distinct segments.
- Below the wheel: large **Spin** button.
- Side or bottom: quiet roster count **24 students on the wheel**.
- Do not show correct answers or evidence on this screen.

```text
┌───────────────────────────────────────────────────────────────┐
│ A Rainy Afternoon             Question 1 of 5  [Full Screen]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                      [ colorful wheel ]                       │
│                            ▼ pointer                          │
│                                                               │
│                          [  Spin  ]                           │
│                    24 students on the wheel                   │
└───────────────────────────────────────────────────────────────┘
```

### Wheel visual direction

- Original, accessible SVG wheel with 5–7 harmonious colors from the palette.
- Soft drop shadow and a clear pointer at the top or right.
- Large center button or separate **Spin** CTA; do not require clicking a tiny target.
- Spin animation approximately **3–5 seconds**, eased toward a clear resting position. This is a design target, not a strict timing requirement.
- Display names on segments when legible. For large classes, shorten labels or use simple numbered segments plus a visible accompanying list; the **final selected name must always appear in full**.
- The wheel must remain usable with one or dozens of student entries, including a single active student.
- Do not show score counters, coins, fireworks, or unrelated games.

### Result state: Keep / Remove

After a spin:

```text
                 Emma Johnson
                   You're up!

        [ Keep ]      [ Remove ]

                  Spin Again
```

- Selected name: the largest text in the view (32–44 px).
- **Keep** is a friendly, positive button. Helper: **Keep on the wheel**.
- **Remove** is a restrained contrasting button. Helper: **Remove from future spins**.
- **Spin Again** is a text or outline action (does not change eligibility).
- A Keep/Remove choice moves forward to the question; no extra confirmation is needed.
- Provide a short completion transition, not a blocking modal.

### Empty roster state

- Title: **No students left on the wheel**.
- Body: **Restore the student list to continue.**
- CTA: **Restore All Students**.
- Do not advance to a spin that cannot select anyone.

---

## 4.5 Screen `TCH-02`: Question, Before Reveal

### Goal

Support a teacher-led verbal answer while keeping all hints concealed.

### Layout

Desktop stacked layout: the page shows only the active question; the excerpt is intentionally absent:

- Top: the selected student's name, the question, and all visible answer options.
- No excerpt panel, no placeholder, and no empty card before reveal; the reading text appears only after **Reveal Answer**.
- Bottom of the viewport: one large primary button **Reveal Answer**, in a bar pinned to the viewport edge so it never scrolls away.

```text
┌──────────────────────────────────────────────────────────────────┐
│ Question 1 of 5                                                  │
│ Emma Johnson                                                     │
│ Why did Anna stay at home?                                       │
│ ○ She felt tired.   ○ It was raining heavily.   ○ She forgot…    │
│                                                                  │
│ [no excerpt before reveal]                                       │
├──────────────────────────────────────────────────────────────────┤
│                                             [   Reveal Answer  ] │
└──────────────────────────────────────────────────────────────────┘
```

### Rules

- **No excerpt** should be visible before reveal, not even as unhighlighted text or an empty panel.
- **No evidence styling** should be visible before reveal, even when annotations exist in the editor.
- **No green correct-answer styling** before reveal.
- Answer choices are presentation items, not student-submitted interactive votes.
- Keep the selected student's name visible, but visually subordinate to the question.
- Show only the current question; there is no full-reading view.
- After reveal, the excerpt appears at the top of the same page (see `TCH-03`).
- All important controls must be reachable by mouse and keyboard.

---

## 4.6 Screen `TCH-03`: Question, Answer Revealed

### Goal

Make the reasoning behind the correct answer instantly visible on a projector.

### Changes from Before Reveal

1. The **Reading Excerpt** panel appears at the top of the stage with the current question's excerpt.
2. The question's **Key Evidence** words/phrases are shown with orange-gold emphasis and bold text inside the excerpt.
3. Evidence associated with other questions stays hidden.
4. The correct option receives a clear green-tinted background, check icon, and **Correct Answer** label.
5. The primary CTA changes to **Next Question**, or **Finish Lesson** for the final question.

### Visual hierarchy

- **Level 0:** the rest of the excerpt remains normal text.
- **Level 1:** Key Evidence is strongly highlighted and bold; attention goes to the decisive words.
- **Answer:** correct choice is independently marked green with a check and text label.

No legend is needed for a single highlight level; the orange emphasis and green correct answer are self-explanatory in context.

### Interaction

- A single click on **Reveal Answer** makes the excerpt appear with the question's Key Evidence, alongside the correct answer.
- Do not animate highlights in an elaborate or distracting way. A quick fade of around 150–250 ms is sufficient.
- Click **Next Question** to hide the excerpt, correct-answer styling, and evidence, and return to the wheel for the next student.

---

## 4.7 Screen `TCH-04`: Lesson Complete

### Goal

A small, positive ending with obvious next steps.

### Copy and layout

- Centered, cheerful original check/book illustration (optional).
- Heading: **Lesson Complete!**
- Supporting copy: **You've finished all 5 questions.**
- Primary button: **Teach Again**.
- Secondary button: **Back to My Readings**.
- No leaderboard, confetti flood, performance graph, or suggested paid upgrade.

A restrained celebratory color accent is appropriate; the screen should stay calm and professional.

---

## 5. Component requirements

| Component | Required states / behavior |
| --- | --- |
| `AppHeader` | Compact app identity; simple navigation; never crowded. |
| `ReadingCard` | Ready/draft, title, excerpt preview, question count, primary teaching action. |
| `ExcerptTextEditor` | Plain-text excerpt for the active question; preserves line breaks; clear Edit state. |
| `ReadingEvidenceViewer` | Displays the active question's excerpt and its one-level Key Evidence ranges; supports direct text selection in mark mode. |
| `EvidenceActions` | Fixed **Highlight Key Evidence** / **Clear Key Evidence** actions under the active question; enabled when an excerpt selection exists. |
| `QuestionTabs` | Ordered question chips, active state, add and accessible reorder actions. |
| `QuestionForm` | Prompt, variable answer options, one correct radio, evidence status. |
| `StudentNamesInput` | Multiline paste, live valid-name count, simple errors. |
| `StudentWheel` | Random outcome, animated spin, selected result, current roster awareness. |
| `SetupWheelPreview` | Decorative only, on Teaching Setup: continuously rotating, one segment per entered name, pauses on hover, no pointer, no selected name, updates while typing, static under reduced motion. |
| `SelectedStudentActions` | **Keep**, **Remove**, **Spin Again**; explicit consequences. |
| `TeachingQuestionPanel` | Read-only options before reveal, one highlighted correct option after reveal. |
| `TeachingProgress` | **Question X of Y** with minimal optional progress bar. |
| `ConfirmDialog` | Only for destructive deletion, excerpt evidence invalidation, or leaving an active session. |
| `Toast` | Small, brief saving/error feedback; non-blocking. |

All reusable controls must have stable hover, focus, disabled, error, and loading states where relevant.

---

## 6. Interaction and motion rules

### 6.1 Microinteractions

- Buttons: subtle 100–160 ms hover color/shadow adjustment.
- Tabs and option selection: immediate feedback, no over-animated movement.
- Contextual evidence action: appear close to selected text without covering it; dismiss on click-away or Escape.
- Save: show **Reading saved** without jumping scroll position.
- Result reveal: 150–250 ms opacity transition; avoid flashing the evidence.
- Wheel: meaningful celebratory motion limited to the wheel itself, with a clear final resting state.

### 6.2 Reduced motion

When `prefers-reduced-motion` is enabled:

- Skip the long spinning rotation; show the random result through a quick or immediate transition.
- Disable decorative bounce and confetti effects.
- The Teaching Setup wheel preview stops animating and shows a static wheel.
- Maintain exact same selection probabilities and teacher actions.

### 6.3 Errors and recovery

- Errors appear next to the relevant field; avoid generic “Something went wrong” when a specific reason is available.
- Prevent accidental deletion of questions or readings through clear confirmations when data loss is significant.
- Changing an annotated excerpt explains the consequence **before** that question's evidence ranges are cleared.
- A wheel with no active names shows **Restore All Students** prominently.
- A disabled button has a visible explanation; never leave the user guessing why Start Teaching is unavailable.

---

## 7. Responsive behavior and projector mode

### 7.1 Breakpoints (guidance, not strict API)

| Width | Layout |
| --- | --- |
| `>= 1200 px` | Two-column Editor layout; stacked Teaching Question layout with a pinned action bar; library 2–3 cards across. |
| `768–1199 px` | Two-column where practical (Editor); stacked Teaching Question layout; possible stacked editor sections on tablet portrait. |
| `< 768 px` | Single-column stack; all buttons and inputs remain usable; the teaching action bar stays pinned; evidence can be selected with browser-native touch selection when supported. |

On smaller viewports, prioritize working functionality over trying to preserve the two-column editor at unreadable widths. The teaching question is stacked at every width.

### 7.2 Full-screen teaching

- Provide a visible **Full Screen** control, with escape support.
- Remove preparation-screen navigation while presenting.
- Keep large enough text for the back of a classroom.
- Allow teacher controls at a consistent location, preferably lower-right or centered depending on screen.
- Keep answer-reveal and next-question controls distinct; do not hide them inside menus.
- On projector displays, the wheel should occupy significant central space without reducing the selected-name text.
- Provide an obvious **Exit Lesson** control with confirmation for accidental exits.

### 7.3 Long content

- For long excerpts, the page scrolls and the excerpt keeps the full content width; there is no separate full-reading pane.
- Preserve paragraph separation and do not truncate the excerpt.
- Revealing evidence does not scroll the page: if the highlighted excerpt is above the viewport, the teacher scrolls to it. The pinned action bar may overlap the bottom of the content while scrolling; everything stays reachable by scrolling further.

---

## 8. Accessibility and readability

- Use semantic heading, form, button, and radio patterns.
- WCAG AA target: **4.5:1** normal-text contrast and **3:1** for large text and key non-text controls.
- Provide visible keyboard focus (2–3 px outline or equivalent) for buttons, tabs, option controls, and menus.
- Minimum pointer target around **44 × 44 px** for frequently used controls.
- Wheel outcomes must be announced in text: **Selected student: Emma Johnson**; never rely on color/pointer position alone.
- **Keep** and **Remove** require explicit text labels, not just icons.
- Correct answer must be explicitly labeled **Correct Answer**, not green only.
- Evidence must be distinguishable by background and font weight. Ensure the highlight preserves adequate text contrast.
- Support keyboard text selection where the browser allows; contextual actions must also be keyboard accessible.
- Do not autoplay distracting sounds or require sound to understand feedback.

---

## 9. English UI copy reference

Use these exact or closely equivalent English strings consistently. Do not introduce Vietnamese translations in the app.

| Context | Copy |
| --- | --- |
| Application name | `ReadingFlow` |
| Library title | `My Readings` |
| Create CTA | `Create Reading` |
| Search placeholder | `Search readings...` |
| Empty library title | `No readings yet` |
| Empty library body | `Create your first reading to get started.` |
| Editor title | `Reading Editor` |
| Reading title label | `Reading Title` |
| Excerpt label | `Reading Excerpt` |
| Excerpt placeholder | `Paste or type this question's excerpt from the book...` |
| Excerpt edit switch | `Edit Excerpt` |
| Evidence switch | `Mark Evidence` |
| No active question | `Add a question to write its excerpt.` |
| No evidence question | `Add a question to write an excerpt and mark evidence.` |
| Library card without excerpt | `No excerpt yet.` |
| Add question | `Add Question` |
| Question placeholder | `Enter your question...` |
| Answer heading | `Answer Options` |
| Add answer option | `Add Option` |
| Correct answer helper | `Select the correct answer.` |
| Key selection action | `Highlight Key Evidence` |
| Key status | `1 Key Evidence highlight` / `2 Key Evidence highlights` |
| Remove key evidence | `Remove Highlight` |
| Clear key evidence | `Clear Key Evidence` |
| Save | `Save Reading` |
| Save success | `Reading saved` |
| Draft label | `Draft` |
| Ready label | `Ready` |
| Teach CTA | `Start Teaching` |
| Incomplete lesson CTA | `Finish Setup` |
| Setup title | `Start Teaching` |
| Student names field | `Student Names` |
| Names placeholder | `Enter student names, one per line...` |
| Student count | `24 students` |
| Setup action | `Start Session` |
| Question progress | `Question 1 of 5` |
| Wheel active count | `24 students on the wheel` |
| Wheel action | `Spin` |
| Result message | `You're up!` |
| Keep result | `Keep` |
| Keep helper | `Keep on the wheel` |
| Remove result | `Remove` |
| Remove helper | `Remove from future spins` |
| Retry | `Spin Again` |
| Empty roster | `No students left on the wheel` |
| Restore roster | `Restore All Students` |
| Reveal action | `Reveal Answer` |
| Correct answer indicator | `Correct Answer` |
| Next action | `Next Question` |
| Final question CTA | `Finish Lesson` |
| Full-screen action | `Full Screen` |
| Exit action | `Exit Lesson` |
| Completion title | `Lesson Complete!` |
| Replay | `Teach Again` |
| Return home | `Back to My Readings` |
| Cancel | `Cancel` |
| Confirm delete | `Delete Reading` |
| Reading deletion warning | `Delete this reading? This action cannot be undone.` |
| Excerpt invalidation warning | `Editing this excerpt will clear its evidence highlights. Continue?` |
| Missing excerpt reason | `Question N has no reading excerpt.` |
| No students error | `Add at least one student to start.` |
| Incomplete reading reason | `Finish the title, questions, answers, and excerpts before teaching.` |
| Unsaved lesson warning | `You have unsaved changes.` |

**Copy tone:** short, encouraging, practical. Avoid exaggerated promotional language and exclamation marks on every screen.

---

## 10. Screen variants for Stitch or a UI agent

Produce these **nine distinct high-fidelity desktop screens/states** as a coherent family:

1. `LIB-01` — **My Readings** with ready lessons and an incomplete draft.
2. `EDT-01A` — **Reading Editor**, active question's excerpt entry with a new empty question.
3. `EDT-01B` — **Reading Editor**, active question with options, its excerpt, and orange Key Evidence inside it.
4. `SET-01` — **Teaching Setup**, populated student names, live count, and the spinning wheel preview beside the field.
5. `TCH-01A` — **Spin the Wheel**, before spinning.
6. `TCH-01B` — **Selected Student**, with **Keep / Remove / Spin Again**.
7. `TCH-02` — **Question Before Reveal**, showing the question and options only; no excerpt, answer, or evidence visible.
8. `TCH-03` — **Answer Revealed**, excerpt with its Key Evidence, and the correct answer highlighted.
9. `TCH-04` — **Lesson Complete**.

### Recommended sample lesson content

**Reading title:** A Rainy Afternoon

**Question 1 excerpt:**

> Anna wanted to visit the park. However, it was raining heavily, so she stayed home.

**Question 1:** Why did Anna stay home?

- She felt tired.
- **It was raining heavily.** *(correct)*
- She forgot her bag.

**Key Evidence:** `raining heavily`

**Question 2 excerpt:**

> At home, Anna made a cup of tea and read a book about birds.

**Question 2:** What did Anna do at home?

- She watched television.
- **She read a book.** *(correct)*
- She played a game.

**Key Evidence:** `read a book`

**Question 3 excerpt:**

> By the evening, the rain stopped and Anna felt happy.

**Question 3:** How did Anna feel?

- **Happy** *(correct)*
- Angry

**Key Evidence:** none

When demonstrating Question 1, show only Question 1's excerpt and evidence. When demonstrating Question 2, show only Question 2's excerpt and evidence. Before revealing answers in a teaching mockup, hide the excerpt, the correct answer, and the evidence even though they have been configured.

---

## 11. Implementation and handoff requirements

For a coding agent or frontend team:

1. **Read `MVP_SPEC.md` before implementing interactions.** This file controls business logic and readiness conditions.
2. Build reusable components and centralized design tokens; avoid hardcoding stylistic values per screen.
3. Implement actual selectable text ranges against each question's saved excerpt; do not fake evidence by hardcoding an HTML `<mark>` in the lesson content.
4. Keep the editor's excerpt input and annotated excerpt viewer grounded in the same saved text.
5. Distinguish **Key Evidence** inside the excerpt with one highlight level; do not add a second evidence layer.
6. Never show the excerpt or any configured evidence in a teaching question until reveal.
7. Model wheel eligibility explicitly. Do not implement an automatic no-repeat policy: only explicit **Remove** changes the active roster.
8. Use native accessible buttons, controls, and keyboard interactions wherever practical.
9. Verify the UI with real multi-paragraph text, long student names, many answer options, and large rosters.
10. Recheck every UI message to ensure **100% English**.
11. Compare the finished UI against the inspiration's **friendly, playful educational feel**, not against an exact copy of its site structure.
12. Do not add unrelated pages, dashboards, metrics, authentication screens, or teacher-account settings.

---

## 12. Visual acceptance checklist

- [ ] Brand identity is original and does not borrow Turtle Diary graphics or trademarks.
- [ ] The experience is distinctly friendly and educational, not a generic B2B admin dashboard.
- [ ] The app still feels calm, minimal, and teacher-first despite cheerful colors.
- [ ] All on-screen copy is English.
- [ ] Library cards clearly prioritize **Start Teaching** and **Create Reading**.
- [ ] The editor gives each question one excerpt, with no whole-reading field and no duplicated quote fields.
- [ ] The current question's Key Evidence is the only highlight level, and the excerpt stays readable.
- [ ] Switching questions changes the excerpt and evidence shown in the editor.
- [ ] Dynamic answer options and the correct-answer radio remain easy to scan.
- [ ] The student wheel is fun, readable, and clearly identifies its selected student.
- [ ] **Keep**, **Remove**, and **Spin Again** have unambiguous meaning and prominence.
- [ ] No excerpt, evidence, or correct-answer colors appear before **Reveal Answer**.
- [ ] After reveal, the excerpt appears with its Key Evidence, and the correct answer is visually distinct.
- [ ] Every teaching stage has an obvious next action and a visible question-progress indicator.
- [ ] Full-screen presentation works on a 16:9 projector without tiny text.
- [ ] Keyboard navigation, focus states, contrast, and reduced-motion behavior are usable.
- [ ] Decorative imagery and animation never compete with the reading text.

---

## 13. Source and interpretation note

**Inspiration site:** https://www.turtlediary.com/

Turtle Diary is a children's learning platform featuring games, quizzes, learning topics, teaching tools, and bright educational presentation. ReadingFlow borrows only the high-level design direction—**colorful friendliness, discoverable actions, simple cards, and playful classroom interactions**—and intentionally removes the complex portal structure to fit the agreed teacher-facing MVP.

For any functional conflict, follow [`MVP_SPEC.md`](./MVP_SPEC.md). For any decorative conflict, prioritize **clarity, accessibility, and simple classroom use** over visual similarity to the inspiration site.
