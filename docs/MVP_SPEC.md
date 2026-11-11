# ReadingFlow — MVP Product & Functional Specification

**Version:** 2.4  
**Status:** Approved scope for MVP implementation  
**Last updated:** November 11, 2026  
**Audience:** Product designer, frontend/backend developers, and AI coding agents  
**UI language:** English only  
**Companion document:** [`UI_SPEC.md`](./UI_SPEC.md)

> This version supersedes the previous MVP specification. There is **no whole-reading passage**: a lesson is a title plus questions, and **each question owns one plain-text excerpt** copied from the book. Evidence has **one visual level per question** (Key Evidence) selected inside that excerpt; the Supporting Passage concept is removed. During teaching, the reveal is **staged**: **Reveal Answer** shows only the correct option, **Show Excerpt** then shows the current question's excerpt, and **Show Key Evidence** finally adds its highlights. The wheel keeps its **explicit Keep / Remove decision after every selection** instead of automatic no-repeat rounds. Browser data saved under the old `v1` storage key is ignored, not migrated or deleted.

---

## 1. Product overview

### 1.1 Purpose

ReadingFlow is a small, teacher-controlled web application for preparing and presenting English reading-comprehension lessons. It helps a teacher:

1. Create a reading lesson from a title plus one short English excerpt per question, copied from the book.
2. Add ordered multiple-choice questions with a flexible number of answer options and one correct answer each.
3. For each question, select the **key words or phrases** inside that question's excerpt that should stand out more strongly.
4. Reuse a saved reading lesson in a classroom session.
5. Enter or paste student names, spin a wheel to choose one student, explicitly **Keep** or **Remove** that student from future spins, and work through the questions in order.
6. Reveal the correct answer, then the excerpt, then the more prominent Key Evidence only when the teacher chooses each step.

The teacher operates the app on one computer, typically connected to a classroom projector. Students answer verbally; they do not need accounts or devices.

### 1.2 Success principles

- **Prepare once, teach repeatedly.** Reading content and question annotations are stored separately from session-specific student names.
- **Annotate the excerpt itself, not a separate evidence field.** Teachers never copy evidence into another field or enter character positions.
- **One level of evidence, one simple workflow.** Each question marks key phrases inside its own excerpt; there is no second, softer level.
- **Evidence belongs to the question.** Moving to another question changes the excerpt and annotations in the editor; annotations do not leak between questions.
- **Teacher-controlled staged reveal.** The taught layer appears only when the teacher asks for it: **Reveal Answer**, then **Show Excerpt**, then **Show Key Evidence**.
- **Teacher-controlled wheel roster.** Spinning never automatically removes a student. Only **Remove** excludes the selected student from future spins; **Keep** leaves them eligible.
- **One clear action at a time.** The product should be simple enough to use without onboarding.
- **English-only product language.** All UI strings, validation messages, labels, and teaching-screen copy must be English.

### 1.3 Roles

| Role | MVP access |
| --- | --- |
| Teacher | Creates and edits readings; selects evidence; starts sessions; enters student names; spins; keeps/removes selected names; reveals answers; progresses through questions. |
| Student | Responds verbally in the classroom; has no separate account or interface. |

---

## 2. MVP boundaries

### 2.1 In scope

- Reading Library: list, create, open/edit, delete, and start teaching.
- Per-question excerpt input: plain text copied from the book, with paragraphs and line breaks.
- Ordered questions: add, edit, delete, and reorder.
- Multiple-choice answers: 2 or more non-empty options, no hard-coded A–D limit, exactly one correct option.
- Question-specific, one-level annotation inside each question's excerpt:
  - **Excerpt:** the plain-text passage a question owns; it is the only reading text stored and shown.
  - **Key Evidence:** zero or more selected word/phrase ranges inside that excerpt, drawn as the stronger level.
- Draft saving and readiness validation.
- Teaching setup: paste or type a list of student names, one per line.
- Random student wheel with a visible selected result, **Keep**, **Remove**, and **Spin Again**.
- Question-by-question teacher-led presentation, revealing the correct answer and the question's evidence.
- Session completion, replaying a lesson, and returning to the library.
- Persistence of reading lessons across page reloads or later visits in the same supported storage environment.
- Desktop-first layout with projector-friendly presentation mode.

### 2.2 Out of scope

- Teacher/student sign-in, user accounts, roles, or multi-tenant collaboration.
- Student phones, classroom join codes, online response submission, or real-time multiplayer.
- Student grades, scores, leaderboards, attendance, performance analytics, or reporting.
- AI-generated reading passages, questions, or answers.
- Importing documents (PDF/Word), OCR, text-to-speech, audio lessons, or translation.
- Answer types other than single-correct-option multiple choice.
- Multiple independent excerpts for a single question; one excerpt per question is the MVP.
- Custom evidence colors and sophisticated rich-text formatting.
- Automatic no-repeat rounds or weighted randomization.
- Advanced class/roster libraries, scheduled lessons, or cross-device synchronization.
- Elaborate game mechanics, achievements, ads, and marketplace features.

---

## 3. Information architecture and user flow

### 3.1 Application areas

| ID | Area | Purpose |
| --- | --- | --- |
| `LIB` | **My Readings** | Library of reusable reading lessons. |
| `EDT` | **Reading Editor** | Title, per-question excerpts, questions, answers, and Key Evidence. |
| `SET` | **Teaching Setup** | Select a prepared reading and enter student names. |
| `TCH` | **Teaching Session** | Spin, keep/remove, ask, reveal, and advance. |

`Teaching Setup` and `Teaching Session` are stages of the same teaching workflow; they need not be separate permanent navigation tabs.

### 3.2 Primary journey

```text
My Readings
  ├─ Create Reading / Edit
  │    ├─ Enter the reading title
  │    ├─ Add an ordered question and its answer options
  │    ├─ Paste that question's excerpt from the book
  │    ├─ Mark Key Evidence inside the excerpt
  │    └─ Save Reading
  │
  └─ Start Teaching
       ├─ Enter student names → Start Session
       └─ Question 1
            ├─ Spin the wheel
            ├─ Selected student → Keep / Remove (or Spin Again)
            ├─ Display the question + options (excerpt and answer hidden)
            ├─ Reveal Answer (correct option only)
            ├─ Show Excerpt (plain excerpt)
            ├─ Show Key Evidence (emphasis inside the excerpt)
            └─ Next Question → repeat
                 └─ Lesson Complete → Teach Again / My Readings
```

---

## 4. Functional requirements

### 4.1 Reading Library (`LIB`)

| ID | Requirement | Priority |
| --- | --- | --- |
| `LIB-01` | Display saved readings with title, a one-line preview of the first question's excerpt, question count, and last-updated date. | Must |
| `LIB-02` | Provide **Create Reading**. | Must |
| `LIB-03` | Allow opening a saved reading in the editor. | Must |
| `LIB-04` | Allow deleting a reading after confirmation. | Must |
| `LIB-05` | Provide **Start Teaching** for valid readings. | Must |
| `LIB-06` | Allow incomplete lessons to be saved as drafts; prevent teaching until requirements in §5 are met. | Must |
| `LIB-07` | Search saved readings by title. | Should |
| `LIB-08` | Show an accessible, useful empty state when no readings exist. | Must |

### 4.2 Reading Editor: title, questions, and excerpts (`EDT`)

| ID | Requirement |
| --- | --- |
| `EDT-01` | Enter and edit the reading title. |
| `EDT-02` | For the active question, paste or type that question's **excerpt** into a plain-text editor. Preserve line breaks. |
| `EDT-03` | The excerpt is the only reading text: there is no whole-reading passage field, view, or stored value. |
| `EDT-04` | Allow adding, editing, deleting, and reordering questions. |
| `EDT-05` | Persist unsaved edits while switching between questions in the current editing session. |
| `EDT-06` | Save the lesson and all its questions together; show success/failure feedback. |
| `EDT-07` | Support a clear **Edit Excerpt** / **Mark Evidence** interaction so ordinary excerpt typing cannot accidentally create annotations. |
| `EDT-08` | If an already annotated excerpt is modified, warn about annotation invalidation before committing the changed text. See §6.5. |
| `EDT-09` | The lesson stores and displays no whole-reading passage anywhere in the editor or teaching flow. |

### 4.3 Question and answer configuration (`QST`)

| ID | Requirement |
| --- | --- |
| `QST-01` | Enter the question prompt. |
| `QST-02` | Add or remove answer options without a fixed count of four. |
| `QST-03` | Mark exactly one answer option as correct using a clear single-select control. |
| `QST-04` | Maintain the configured order of questions during teaching. |
| `QST-05` | Removing the correct option clears the correct-option selection and requires choosing another. |
| `QST-06` | Require at least two non-empty options for a question to be teachable. |
| `QST-07` | Each question has one excerpt, shown during teaching only after **Show Excerpt** in place of any whole-reading text. |

### 4.4 Question-specific evidence (`EVD`)

#### Definitions

- **Excerpt:** the plain-text passage a question owns, copied from the book. It is the only reading text stored and shown.
- **Key Evidence:** zero or more words or phrases selected inside that question's Excerpt; the stronger highlight. Optional.
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
| `EVD-13` | No evidence may appear before **Show Key Evidence**; the excerpt and answer layers follow their own steps too. |

**Example:**

Excerpt:

> Anna wanted to visit the park. However, it was raining heavily, so she stayed home.

Question: *Why did Anna stay home?*

- **Key Evidence:** `raining heavily`

The phrase *raining heavily* has a stronger highlight and font weight; the rest of the excerpt stays normal text. The annotation belongs only to this question.

### 4.5 Teaching Setup (`SET`)

| ID | Requirement |
| --- | --- |
| `SET-01` | Start teaching from an eligible, saved reading. |
| `SET-02` | Provide one multiline textarea: **Enter student names, one per line**. |
| `SET-03` | Trim whitespace and ignore empty lines. |
| `SET-04` | Show the parsed student count and allow reviewing/editing before starting. |
| `SET-05` | Require at least one valid student name before **Start Session** is enabled. |
| `SET-06` | Names are session-specific; creating permanent student accounts or class records is not required. |
| `SET-07` | Repeated display names are permitted and treated as separate entries with distinct internal IDs; disambiguate identical labels on the wheel when necessary. |

### 4.6 Random wheel and Keep / Remove (`SPN`)

| ID | Requirement |
| --- | --- |
| `SPN-01` | At each question, show a student wheel using all **currently active** entries. |
| `SPN-02` | Clicking **Spin** selects one active student randomly with equal probability. |
| `SPN-03` | Animate the wheel and prominently display the selected student's name after it stops. |
| `SPN-04` | After a result, show **Keep**, **Remove**, and a less prominent **Spin Again** action. |
| `SPN-05` | **Keep:** student remains in the active wheel for subsequent questions, including the immediately next spin. |
| `SPN-06` | **Remove:** student is excluded from all subsequent spins in the current session only. The selected student still answers the current question. |
| `SPN-07` | **Spin Again:** discard the current result and select again from the active roster; no roster change takes place until **Keep** or **Remove**. |
| `SPN-08` | The teacher must choose **Keep** or **Remove** for the final selected student before continuing to the question. |
| `SPN-09` | The system must **not** automatically remove or auto-rotate students after being selected. No automatic no-repeat round is used in this MVP. |
| `SPN-10` | The teacher can restore the original roster for the current session via **Restore All Students** when all have been removed; this does not reset the current question or reading. |
| `SPN-11` | If no active names remain, disable **Spin** and present a clear restoration action rather than showing an empty or broken wheel. |

**Randomness contract:** Choose uniformly from the active student entries. The wheel's visual spin is an animation of that result, not a physics-based probability engine. Prevent multiple simultaneous spins.

### 4.7 Teaching and answer reveal (`TCH`)

| ID | Requirement |
| --- | --- |
| `TCH-01` | Progress through questions in the configured order, showing **Question X of Y**. |
| `TCH-02` | The student-selection wheel precedes each question's answering stage. |
| `TCH-03` | After **Keep** or **Remove**, show the selected student, the question, and all answer options; keep the excerpt hidden. |
| `TCH-04` | Before each reveal step, show none of that step's content: no excerpt before **Show Excerpt**, no correct-answer styling before **Reveal Answer**, and no evidence highlights before **Show Key Evidence**. |
| `TCH-05` | **Reveal Answer** identifies the correct option clearly and changes nothing else. |
| `TCH-06` | **Show Excerpt** shows the current question's excerpt as plain text; **Show Key Evidence** then applies only the current question's Key Evidence emphasis. |
| `TCH-07` | **Next Question** is available after the evidence step, or after the excerpt step when the question has no Key Evidence; it advances by exactly one question and returns to the wheel with all reveal layers hidden again. |
| `TCH-08` | After the final question, show **Lesson Complete** with **Teach Again** and **Back to My Readings**. |
| `TCH-09` | Provide **Full Screen** teaching mode with projector-friendly typography and teacher controls. |
| `TCH-10` | Teaching never requires student devices, submitted answers, scores, or marking a student right/wrong. |
| `TCH-11` | Leaving an active lesson intentionally should require confirmation to avoid accidental interruption. |

---

## 5. Validation and readiness rules

A reading can be saved as a **Draft** at any point. **Start Teaching** is enabled only if all of the following hold:

1. Reading title is not blank.
2. There is at least one question.
3. Every question has a non-empty prompt.
4. Every question has at least two non-empty answer options.
5. Every question has exactly one correct option.
6. Every question's excerpt contains non-whitespace text.

Key Evidence is optional and never blocks readiness. All readiness errors should appear near the relevant question or field in plain English. Save Draft remains available even if the reading is incomplete.

### 5.1 Annotation selection rules

- An empty selection is ignored.
- The selected text must come from the displayed excerpt rather than a button, menu, or answer input.
- Key Evidence selections must lie within that question's excerpt and cannot be zero-length.
- Overlapping or adjacent Key Evidence selections should merge into one range to avoid ambiguous nested styling.
- `startOffset < endOffset`; ranges use **half-open offsets** `[startOffset, endOffset)` in the canonical `Question.passage` string.
- Display does not change the original text. All highlights are rendering metadata, not inserted HTML tags in the stored excerpt.

---

## 6. Data model and persistence

Models are conceptual and implementation-agnostic. An application may implement them with a relational database, JSON store, or browser persistence appropriate to the chosen stack.

### 6.1 Reading

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Stable reading ID. |
| `title` | string | Lesson title. |
| `questions` | `Question[]` | Ordered questions, each with its own excerpt. |
| `createdAt` | datetime | Created time. |
| `updatedAt` | datetime | Last edit time. |

A reading stores no whole-reading passage.

### 6.2 Question

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Stable question ID. |
| `order` | integer | Teaching position. |
| `prompt` | string | Question text. |
| `passage` | string | The question's excerpt from the book; preserve line breaks. |
| `options` | `AnswerOption[]` | Flexible answer list. |
| `correctOptionId` | string or null | Exactly one correct option when valid. |
| `keyEvidence` | `TextRange[]` | Highlight ranges inside this question's `passage`. |

### 6.3 AnswerOption

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Stable option ID. |
| `text` | string | Option text. |
| `order` | integer | Display order. |

### 6.4 TextRange

```ts
type TextRange = {
  startOffset: number; // inclusive
  endOffset: number;   // exclusive
};
```

Offsets refer to the **same canonical, unformatted `Question.passage` string**. For a JavaScript/TypeScript frontend, use UTF-16 string indices consistently, including around newlines and non-ASCII characters. Derive offsets from the selected DOM text mapped back to the canonical string; do not derive them by a naïve `indexOf(selectedText)` lookup, because a phrase may occur more than once.

Rendering order:

1. In the editor, render the question's excerpt.
2. In teaching, render nothing until **Show Excerpt**; the teaching excerpt panel is hidden before that step.
3. After **Show Excerpt**, render the excerpt as plain text; after **Show Key Evidence**, render its Key Evidence spans with stronger contrast and font weight.

Store plain text and safe ranges; do not save raw HTML from a rich-text selection.

### 6.5 Editing an excerpt after annotation

**MVP safety rule:** Changing a question's excerpt invalidates that question's offsets. To prevent mismatched evidence:

1. Typing in **Edit Excerpt** mode updates the question's excerpt draft.
2. Leaving Edit mode, switching questions, adding a question, or saving compares the excerpt against the baseline it had when the question became active.
3. If the text is unchanged, retain annotations.
4. If the text changed and that question has highlights, show a clear confirmation: **“Editing this excerpt will clear its evidence highlights. Continue?”**
5. On confirmation, keep the new text and clear **only that question's** Key Evidence ranges.
6. On cancellation, restore the previous text and keep that question's highlights without data loss.

Automatic range reconciliation is outside MVP scope. Do not silently attach old ranges to new text.

### 6.6 Session state

```ts
type StudentEntry = {
  id: string;
  name: string;
  isActive: boolean; // false only after explicit Remove
};

type SessionPhase =
  | "spin"
  | "selected"
  | "question"
  | "answer"
  | "excerpt"
  | "evidence"
  | "completed";

type TeachingSession = {
  readingId: string;
  questionIndex: number;
  phase: SessionPhase;
  students: StudentEntry[];
  selectedStudentId: string | null;
};
```

A session uses a snapshot of the reading's title and question configuration, including each question's excerpt, at its start; the teacher does not edit the reading during that session. Lesson storage is durable in the supported environment; cross-device session sync and recovery after unexpected browser closure are not required for MVP.

### 6.7 Example stored reading (illustrative)

```json
{
  "id": "reading-001",
  "title": "A Rainy Afternoon",
  "questions": [
    {
      "id": "question-001",
      "order": 0,
      "prompt": "Why did Anna stay home?",
      "passage": "Anna wanted to visit the park. However, it was raining heavily, so she stayed home.",
      "options": [
        { "id": "a", "text": "She felt tired.", "order": 0 },
        { "id": "b", "text": "It was raining heavily.", "order": 1 },
        { "id": "c", "text": "She forgot her bag.", "order": 2 }
      ],
      "correctOptionId": "b",
      "keyEvidence": [{ "startOffset": 47, "endOffset": 62 }]
    }
  ]
}
```

**Implementation note:** The example ranges are illustrative; implementations must compute and validate exact offsets from the actual canonical string rather than copying the numbers above.

---

## 7. Teaching state machine

| Current phase | Teacher action | Next phase | Roster effect | Reveal state |
| --- | --- | --- | --- | --- |
| `spin` | Spin | `selected` | None | Hidden |
| `selected` | Spin Again | `selected` after animation | None | Hidden |
| `selected` | Keep | `question` | Selected student stays active | Hidden |
| `selected` | Remove | `question` | Selected student becomes inactive | Hidden |
| `question` | Reveal Answer | `answer` | None | Correct option shown; excerpt and evidence hidden |
| `answer` | Show Excerpt | `excerpt` | None | Excerpt shown plain; evidence hidden |
| `excerpt` | Show Key Evidence | `evidence` | None | This question's Key Evidence shown |
| `excerpt` | Next Question / Finish Lesson (no Key Evidence) | `spin` / `completed` | Preserve roster | Hidden / Complete |
| `evidence` | Next Question (not final) | `spin` | Preserve roster | Hidden |
| `evidence` | Finish Lesson (final question) | `completed` | No change | Complete |
| `completed` | Teach Again | Setup or new `spin` session | Restore initial roster after re-confirming setup | Hidden |
| Any non-complete phase | Exit, then confirm | Library | Discard session-only state | N/A |

If zero students are active when entering `spin`, show the empty-roster state; **Restore All Students** makes all session entries active again. This does not change the question index.

---

## 8. Detailed end-to-end scenarios

### Scenario A — Create and annotate

1. Open **My Readings** and click **Create Reading**.
2. Enter **A Rainy Afternoon**.
3. Click **Add Question** and enter a prompt.
4. Add any number of answer options (minimum two), then select the one correct answer.
5. Paste that question's excerpt from the book into **Reading Excerpt**.
6. In **Mark Evidence**, select `raining heavily` inside the excerpt; click **Highlight Key Evidence**.
7. Add another question with its own excerpt. Its evidence starts empty and is edited independently.
8. Save as draft at any time; once all questions are valid, click **Start Teaching**.

### Scenario B — Conduct one question

1. Choose a saved reading and paste student names into Teaching Setup.
2. Click **Start Session**; the wheel for **Question 1 of N** appears.
3. Click **Spin**; the wheel selects **Emma Johnson**.
4. Choose **Keep** (Emma remains eligible) or **Remove** (Emma is excluded from subsequent spins). Optionally choose **Spin Again** before deciding.
5. Show the selected student, the question, and answer choices; keep the excerpt hidden. No answer or evidence is visibly marked.
6. The student responds verbally. Click **Reveal Answer**; only the correct option turns green.
7. Ask which part of the text supports the answer, then click **Show Excerpt**. The excerpt appears as plain text.
8. Ask which words support the answer, then click **Show Key Evidence**. The question's Key Evidence becomes stronger/bolder.
9. Click **Next Question**. The excerpt, answer, and evidence reset to hidden, and the wheel is ready for another student.
10. After the last question, display **Lesson Complete**.

### Scenario C — All students removed

1. Teacher removes the last active student after a spin.
2. The current selected student can finish the current question.
3. At the next wheel stage, **Spin** is disabled and a message appears: **“No students left on the wheel.”**
4. Click **Restore All Students**. All original session entries become eligible to spin again; the lesson remains on the same question.

---

## 9. Non-functional requirements

| Area | MVP expectation |
| --- | --- |
| Language | All visible UI, alerts, validation, tooltips, and empty states are English. |
| Usability | Clear primary action at each step; no separate evidence form; minimal controls. |
| Readability | Suitable for a typical 1366×768 or larger laptop and 1920×1080 projector. |
| Accessibility | Keyboard-focusable controls, visible focus state, meaningful labels, no meaning conveyed by color alone, reduced-motion support. |
| Performance | Smooth interactions on a normal classroom laptop. Avoid heavy media and large UI libraries solely for decoration. |
| Data safety | No silent loss of saved lessons or annotations. Warn before deleting lessons or clearing evidence. |
| Privacy | Student names are used for the current class session; avoid needless analytics, tracking, or account collection. |
| Reliability | The wheel never selects a removed student; the excerpt, correct option, and evidence never reveal early. |
| Portability | Browser-based; technology/framework choice is outside this product specification. |

UI-specific sizing, colors, layout, responsive behavior, and reference-inspired visual style are defined in [`UI_SPEC.md`](./UI_SPEC.md).

---

## 10. Acceptance criteria

The following are required for MVP sign-off:

| ID | Test | Expected result |
| --- | --- | --- |
| `AC-01` | Enter a title and a multi-paragraph excerpt for a question; save and reopen. | All text and paragraph breaks persist; there is no whole-reading field. |
| `AC-02` | Add a question with 2 options and another with 5 options. | Both render correctly; one correct answer per question. |
| `AC-03` | Select a phrase in Question 1's excerpt. | Only that range gets the strong style while Q1 is active. |
| `AC-04` | Select two phrases in the same excerpt (overlapping or separate). | Both stand out; overlapping selections merge. |
| `AC-05` | Give two questions different excerpts. | Each shows only its own excerpt and highlights. |
| `AC-06` | Edit an annotated excerpt and confirm; then repeat and cancel. | Confirm clears only that question's highlights; Cancel restores the old text and keeps them. |
| `AC-07` | Save/reopen the reading. | All questions, options, ordering, correct choices, excerpts, and evidence ranges persist accurately. |
| `AC-08` | Save a reading whose questions have no highlights. | The reading is Ready and Start Teaching is enabled. |
| `AC-09` | Save an incomplete question (for example, an empty excerpt). | Draft saves; Start Teaching is unavailable with a useful validation reason. |
| `AC-10` | Paste names including blank lines and extra spaces. | Valid names and count are parsed correctly; blank lines disappear. |
| `AC-11` | Spin and select **Keep**. | Student remains eligible for future spins; no automatic exclusion occurs. |
| `AC-12` | Spin and select **Remove**. | Student is absent from all subsequent wheel selections in that session. |
| `AC-13` | Select **Spin Again** before Keep/Remove. | A new valid result is shown; roster is unchanged by the discarded result. |
| `AC-14` | Remove all students and advance to another wheel stage. | No broken/empty spin; Restore All Students is available. |
| `AC-15` | Display a question before clicking Reveal Answer. | The excerpt, correct option, and Key Evidence are all hidden. |
| `AC-16` | Click Reveal Answer, then Show Excerpt, then Show Key Evidence. | Each action reveals only its layer: correct option first, plain excerpt second, current question's Key Evidence last; exactly one correct option is identified. |
| `AC-17` | Click Next Question. | Progress increments by one; wheel returns; excerpt, answer, and evidence are hidden. |
| `AC-18` | Complete the final question. | Lesson Complete offers Teach Again and Back to My Readings. |
| `AC-19` | Switch to full screen on a projector. | Question, excerpt, choices, wheel, and teacher actions remain readable. |
| `AC-20` | Inspect all UI strings. | No Vietnamese or mixed-language UI text is present. |

---

## 11. Suggested implementation sequence

1. **Models and storage:** reading/question/option/range models, draft persistence, readiness validation.
2. **Library:** create/edit/delete/start actions.
3. **Editor:** title, per-question excerpts, dynamic answers, question ordering.
4. **One-level evidence:** selection-to-range mapping, containment rules, independent per-question styling, excerpt invalidation safeguards.
5. **Teaching setup and wheel:** name parsing, random selection, Keep/Remove, zero-active recovery.
6. **Teaching player:** staged reveal states, answer/excerpt/evidence rendering, ordered progression, full-screen mode.
7. **Polish and validation:** usability, accessibility, projector check, cross-screen visual consistency, acceptance tests.

---

## 12. Open items intentionally deferred

The following decisions are **not prerequisites** for implementing the agreed MVP: backend framework, deployment host, database engine, sign-in, roster reuse, session analytics, additional question types, multiple excerpts per question, and AI-assisted authoring.

The UI design direction and the English copy inventory are specified separately in [`UI_SPEC.md`](./UI_SPEC.md). In case of conflict, **this document controls product behavior**; `UI_SPEC.md` controls visual presentation and interaction affordances.
