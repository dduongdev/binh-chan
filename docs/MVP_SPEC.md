# ReadingFlow — MVP Product & Functional Specification

**Version:** 2.1  
**Status:** Approved scope for MVP implementation  
**Last updated:** November 10, 2026  
**Audience:** Product designer, frontend/backend developers, and AI coding agents  
**UI language:** English only  
**Companion document:** [`UI_SPEC.md`](./UI_SPEC.md)

> This version supersedes the previous MVP specification. Evidence has **two visual levels per question** (Supporting Passage + Key Evidence), and the wheel uses an **explicit Keep / Remove decision after every selection** instead of automatic no-repeat rounds. v2.1 makes Key Evidence selectable anywhere in the passage and the Supporting Passage optional.

---

## 1. Product overview

### 1.1 Purpose

ReadingFlow is a small, teacher-controlled web application for preparing and presenting English reading-comprehension lessons. It helps a teacher:

1. Create a reading lesson by entering an entire English reading passage.
2. Add ordered multiple-choice questions with a flexible number of answer options and one correct answer each.
3. For each question, select the **key words or phrases** anywhere in the original reading that should stand out more strongly, and optionally frame them with a **supporting passage**.
4. Reuse a saved reading lesson in a classroom session.
5. Enter or paste student names, spin a wheel to choose one student, explicitly **Keep** or **Remove** that student from future spins, and work through the questions in order.
6. Reveal the correct answer, supporting passage, and more prominent key evidence only when the teacher chooses to do so.

The teacher operates the app on one computer, typically connected to a classroom projector. Students answer verbally; they do not need accounts or devices.

### 1.2 Success principles

- **Prepare once, teach repeatedly.** Reading content and question annotations are stored separately from session-specific student names.
- **Annotate the original text, not a duplicate.** Teachers never copy evidence into a separate field or enter character positions.
- **Two levels of evidence, one simple workflow.** Each question marks stronger key phrases, optionally framed by a broader supporting passage.
- **Evidence belongs to the question.** Moving to another question changes the visible annotations; annotations do not leak between questions.
- **Teacher-controlled reveal.** No answer correctness or evidence is visible before the teacher clicks **Reveal Answer**.
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
- Complete passage input: plain text with paragraphs and line breaks.
- Ordered questions: add, edit, delete, and reorder.
- Multiple-choice answers: 2 or more non-empty options, no hard-coded A–D limit, exactly one correct option.
- Question-specific, two-level annotation directly on the passage:
  - **Supporting Passage:** one optional contiguous selected excerpt from the full reading for each question, drawn as the softer level.
  - **Key Evidence:** one or more selected word/phrase ranges anywhere in the reading, drawn as the stronger level.
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
- Multiple independent Supporting Passage regions for a single question; this can be considered after MVP.
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
| `EDT` | **Reading Editor** | Entire-passage entry, questions, answers, and two-level evidence. |
| `SET` | **Teaching Setup** | Select a prepared reading and enter student names. |
| `TCH` | **Teaching Session** | Spin, keep/remove, ask, reveal, and advance. |

`Teaching Setup` and `Teaching Session` are stages of the same teaching workflow; they need not be separate permanent navigation tabs.

### 3.2 Primary journey

```text
My Readings
  ├─ Create Reading / Edit
  │    ├─ Enter title and entire reading passage
  │    ├─ Add ordered question and answer options
  │    ├─ Optionally select a Supporting Passage for the current question
  │    ├─ Mark Key Evidence anywhere in the passage
  │    └─ Save Reading
  │
  └─ Start Teaching
       ├─ Enter student names → Start Session
       └─ Question 1
            ├─ Spin the wheel
            ├─ Selected student → Keep / Remove (or Spin Again)
            ├─ Display passage + question + options (answer hidden)
            ├─ Reveal Answer (correct option + evidence)
            └─ Next Question → repeat
                 └─ Lesson Complete → Teach Again / My Readings
```

---

## 4. Functional requirements

### 4.1 Reading Library (`LIB`)

| ID | Requirement | Priority |
| --- | --- | --- |
| `LIB-01` | Display saved readings with title, question count, and last-updated date. | Must |
| `LIB-02` | Provide **Create Reading**. | Must |
| `LIB-03` | Allow opening a saved reading in the editor. | Must |
| `LIB-04` | Allow deleting a reading after confirmation. | Must |
| `LIB-05` | Provide **Start Teaching** for valid readings. | Must |
| `LIB-06` | Allow incomplete lessons to be saved as drafts; prevent teaching until requirements in §5 are met. | Must |
| `LIB-07` | Search saved readings by title. | Should |
| `LIB-08` | Show an accessible, useful empty state when no readings exist. | Must |

### 4.2 Reading Editor: entire passage (`EDT`)

| ID | Requirement |
| --- | --- |
| `EDT-01` | Enter and edit the reading title. |
| `EDT-02` | Paste or type the **entire original passage** into one multi-paragraph text editor. Preserve line breaks. |
| `EDT-03` | Show the complete passage during question configuration, not a separate copied evidence field. |
| `EDT-04` | Allow adding, editing, deleting, and reordering questions. |
| `EDT-05` | Persist unsaved edits while switching between questions in the current editing session. |
| `EDT-06` | Save the whole reading and its questions together; show success/failure feedback. |
| `EDT-07` | Support a clear **Edit Passage** / **Mark Evidence** interaction so ordinary passage editing cannot accidentally create annotations. |
| `EDT-08` | If an already annotated passage is modified, warn about annotation invalidation before committing the changed text. See §6.5. |

### 4.3 Question and answer configuration (`QST`)

| ID | Requirement |
| --- | --- |
| `QST-01` | Enter the question prompt. |
| `QST-02` | Add or remove answer options without a fixed count of four. |
| `QST-03` | Mark exactly one answer option as correct using a clear single-select control. |
| `QST-04` | Maintain the configured order of questions during teaching. |
| `QST-05` | Removing the correct option clears the correct-option selection and requires choosing another. |
| `QST-06` | Require at least two non-empty options for a question to be teachable. |

### 4.4 Two-level question-specific evidence (`EVD`)

#### Definitions

- **Original Passage:** The complete reading text stored on the lesson.
- **Supporting Passage:** An optional contiguous span selected from the Original Passage to give a question's answer broader context. It can cover a sentence, several sentences, or part of a paragraph. This is the **first / softer visual level**.
- **Key Evidence:** One or more words or phrases selected **anywhere in the Original Passage**. They are the **second / stronger visual level**; where a key range overlaps the Supporting Passage it is emphasized on top of the broader highlighted excerpt.
- **Current Question:** The question being edited or taught. Only its annotations can appear.

For MVP, each question may have **one optional Supporting Passage region** and **zero or more Key Evidence regions while drafting**. A question must have **at least one Key Evidence region** to be ready for teaching.

#### Required behavior

| ID | Requirement |
| --- | --- |
| `EVD-01` | Teachers select a question, then select text directly in the Original Passage. |
| `EVD-02` | A small contextual action **Set Supporting Passage** appears for a valid passage selection. |
| `EVD-03` | The selected region is stored as that question's Supporting Passage and shown with a subtle background highlight. |
| `EVD-04` | Teachers select words/phrases anywhere in the Original Passage and choose **Highlight Key Evidence**; a Supporting Passage is not required. |
| `EVD-05` | Key Evidence receives a stronger visual treatment than the surrounding text, and than an overlapping Supporting Passage. |
| `EVD-06` | A Key Evidence selection must lie within the Original Passage and cannot be zero-length. It need not be inside the Supporting Passage. |
| `EVD-07` | Teachers can add multiple independent Key Evidence ranges anywhere in the passage. |
| `EVD-08` | Switching questions hides other questions' annotations and displays only the current question's annotations. |
| `EVD-09` | Different questions can reuse the same passage text and/or ranges without conflict. |
| `EVD-10` | Teachers can remove an individual Key Evidence range, clear all key highlights, or replace the Supporting Passage. |
| `EVD-11` | Replacing or clearing the Supporting Passage leaves Key Evidence untouched. |
| `EVD-12` | Teachers never enter a quote into another field, choose colors, or manually enter start/end offsets. |
| `EVD-13` | The unselected, unrevealed evidence remains hidden in the Teaching Session until **Reveal Answer**. |

**Example:**

Original passage:

> Anna wanted to visit the park with her friends. However, it was raining heavily, so she decided to stay at home and read a book.

Question: *Why did Anna stay at home?*

- **Supporting Passage:** `However, it was raining heavily, so she decided to stay at home and read a book.`
- **Key Evidence:** `it was raining heavily`

The broader sentence has a pale warm highlight. The phrase *it was raining heavily* has a richer highlight and stronger font weight. Both annotations belong only to this question.

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
| `TCH-03` | After **Keep** or **Remove**, show the selected student, full reading passage, current question, and all answer options. |
| `TCH-04` | Before reveal, show **no correct-answer styling** and **no supporting/key evidence highlights**. |
| `TCH-05` | **Reveal Answer** identifies the correct option clearly and applies the Key Evidence emphasis, plus the Supporting Passage emphasis when one is set. |
| `TCH-06` | Reveal annotations only from the current question, even if the same text was annotated for another question. |
| `TCH-07` | **Next Question** advances by exactly one question and returns to the wheel with hidden-answer state restored. |
| `TCH-08` | After the final question, show **Lesson Complete** with **Teach Again** and **Back to My Readings**. |
| `TCH-09` | Provide **Full Screen** teaching mode with projector-friendly typography and teacher controls. |
| `TCH-10` | Teaching never requires student devices, submitted answers, scores, or marking a student right/wrong. |
| `TCH-11` | Leaving an active lesson intentionally should require confirmation to avoid accidental interruption. |

---

## 5. Validation and readiness rules

A reading can be saved as a **Draft** at any point. **Start Teaching** is enabled only if all of the following hold:

1. Reading title is not blank.
2. Original Passage contains non-whitespace text.
3. There is at least one question.
4. Every question has a non-empty prompt.
5. Every question has at least two non-empty answer options.
6. Every question has exactly one correct option.
7. Every question has at least one valid Key Evidence range within the Original Passage.
8. No annotation points outside the current passage text.

All readiness errors should appear near the relevant question or field in plain English. Save Draft remains available even if the reading is incomplete.

### 5.1 Annotation selection rules

- An empty selection is ignored.
- The selected text must come from the displayed Original Passage rather than a button, menu, or answer input.
- Supporting Passage selections must be contiguous; no multi-range selections in the MVP.
- Key Evidence selections must lie within the Original Passage and cannot be zero-length; they may fall outside the Supporting Passage.
- Overlapping or adjacent Key Evidence selections should merge into one range to avoid ambiguous nested styling.
- `startOffset < endOffset`; ranges use **half-open offsets** `[startOffset, endOffset)` in the canonical passage string.
- Display does not change the original text. All highlights are rendering metadata, not inserted HTML tags in the stored passage.

---

## 6. Data model and persistence

Models are conceptual and implementation-agnostic. An application may implement them with a relational database, JSON store, or browser persistence appropriate to the chosen stack.

### 6.1 Reading

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Stable reading ID. |
| `title` | string | Lesson title. |
| `content` | string | Entire original reading passage; preserve line breaks. |
| `questions` | `Question[]` | Ordered questions. |
| `createdAt` | datetime | Created time. |
| `updatedAt` | datetime | Last edit time. |

### 6.2 Question

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Stable question ID. |
| `order` | integer | Teaching position. |
| `prompt` | string | Question text. |
| `options` | `AnswerOption[]` | Flexible answer list. |
| `correctOptionId` | string or null | Exactly one correct option when valid. |
| `supportingPassage` | `TextRange` or null | Optional first-level excerpt for this question. |
| `keyEvidence` | `TextRange[]` | Stronger highlight ranges anywhere in the passage. |

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

Offsets refer to the **same canonical, unformatted `Reading.content` string**. For a JavaScript/TypeScript frontend, use UTF-16 string indices consistently, including around newlines and non-ASCII characters. Derive offsets from the selected DOM text mapped back to the canonical string; do not derive them by a naïve `indexOf(selectedText)` lookup, because a phrase may occur more than once.

Rendering order:

1. Render the complete original content.
2. If the question has a Supporting Passage and its evidence is visible, shade it.
3. Render Key Evidence spans with stronger contrast and font weight; a key range outside the Supporting Passage is drawn on plain text, and inside it, on top of the pale background.
4. When evidence is not visible, render the original content normally.

Store plain text and safe ranges; do not save raw HTML from a rich-text selection.

### 6.5 Editing passage text after annotation

**MVP safety rule:** Changing the canonical passage text after annotations exist invalidates the existing offsets. To prevent mismatched evidence:

1. Let the teacher enter the proposed text change in **Edit Passage** mode.
2. If the normalized content is actually unchanged, retain annotations.
3. If changed content would affect existing annotations, show a clear confirmation: **“Editing this passage will clear the existing evidence highlights. Continue?”**
4. On confirmation, save the new text and clear **all questions'** Supporting Passage and Key Evidence ranges for that reading.
5. On cancellation, return to the unmodified saved passage/annotations without data loss.

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
  | "revealed"
  | "completed";

type TeachingSession = {
  readingId: string;
  questionIndex: number;
  phase: SessionPhase;
  students: StudentEntry[];
  selectedStudentId: string | null;
};
```

A session uses a snapshot of the reading content and question configuration at its start; the teacher does not edit the reading during that session. Lesson storage is durable in the supported environment; cross-device session sync and recovery after unexpected browser closure are not required for MVP.

### 6.7 Example stored reading (illustrative)

```json
{
  "id": "reading-001",
  "title": "A Rainy Afternoon",
  "content": "Anna wanted to visit the park with her friends. However, it was raining heavily, so she decided to stay at home and read a book.",
  "questions": [
    {
      "id": "question-001",
      "order": 0,
      "prompt": "Why did Anna stay at home?",
      "options": [
        { "id": "a", "text": "She felt tired.", "order": 0 },
        { "id": "b", "text": "It was raining heavily.", "order": 1 },
        { "id": "c", "text": "She forgot her bag.", "order": 2 }
      ],
      "correctOptionId": "b",
      "supportingPassage": { "startOffset": 50, "endOffset": 132 },
      "keyEvidence": [{ "startOffset": 66, "endOffset": 88 }]
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
| `question` | Reveal Answer | `revealed` | None | Correct option + evidence shown |
| `revealed` | Next Question (not final) | `spin` | Preserve roster | Hidden |
| `revealed` | Finish Lesson (final question) | `completed` | No change | Complete |
| `completed` | Teach Again | Setup or new `spin` session | Restore initial roster after re-confirming setup | Hidden |
| Any non-complete phase | Exit, then confirm | Library | Discard session-only state | N/A |

If zero students are active when entering `spin`, show the empty-roster state; **Restore All Students** makes all session entries active again. This does not change the question index.

---

## 8. Detailed end-to-end scenarios

### Scenario A — Create and annotate

1. Open **My Readings** and click **Create Reading**.
2. Enter **A Rainy Afternoon** and paste the entire multi-paragraph reading.
3. Click **Add Question** and enter a prompt.
4. Add any number of answer options (minimum two), then select the one correct answer.
5. Select a sentence or excerpt in the Original Passage; click **Set Supporting Passage**.
6. Select `it was raining heavily` inside that excerpt; click **Highlight Key Evidence**.
7. Switch to another question. Its evidence starts empty and is edited independently.
8. Save as draft at any time; once all questions are valid, click **Start Teaching**.

### Scenario B — Conduct one question

1. Choose a saved reading and paste student names into Teaching Setup.
2. Click **Start Session**; the wheel for **Question 1 of N** appears.
3. Click **Spin**; the wheel selects **Emma Johnson**.
4. Choose **Keep** (Emma remains eligible) or **Remove** (Emma is excluded from subsequent spins). Optionally choose **Spin Again** before deciding.
5. Show the selected student, original reading, question, and answer choices. No answer or evidence is visibly marked.
6. The student responds verbally. Click **Reveal Answer**.
7. The correct option turns green. The Supporting Passage receives a gentle warm background; its Key Evidence becomes stronger/bolder.
8. Click **Next Question**. The answer and evidence reset to hidden and the wheel is ready for another student.
9. After the last question, display **Lesson Complete**.

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
| Reliability | The wheel never selects a removed student; the correct option and evidence never reveal early. |
| Portability | Browser-based; technology/framework choice is outside this product specification. |

UI-specific sizing, colors, layout, responsive behavior, and reference-inspired visual style are defined in [`UI_SPEC.md`](./UI_SPEC.md).

---

## 10. Acceptance criteria

The following are required for MVP sign-off:

| ID | Test | Expected result |
| --- | --- | --- |
| `AC-01` | Paste an entire multi-paragraph text and save. | All text and paragraph breaks persist on reopening. |
| `AC-02` | Add a question with 2 options and another with 5 options. | Both render correctly; one correct answer per question. |
| `AC-03` | Select a Supporting Passage for Question 1. | Only the selected excerpt has the first-level style while Q1 is active. |
| `AC-04` | Select two Key Evidence phrases (inside or outside a Supporting Passage). | Both stand out more strongly. |
| `AC-05` | Highlight Key Evidence outside the Supporting Passage. | The range is saved and shown with the stronger style. |
| `AC-06` | Configure different evidence for Question 2 and switch between Q1/Q2. | Each question displays only its own Supporting Passage and Key Evidence. |
| `AC-07` | Save/reopen the reading. | All questions, options, ordering, correct choices, and evidence ranges persist accurately. |
| `AC-08` | Modify annotated passage text and confirm. | The teacher is warned and all invalid evidence is cleared; nothing is silently shifted. |
| `AC-09` | Save an incomplete question. | Draft saves; Start Teaching is unavailable with a useful validation reason. |
| `AC-10` | Paste names including blank lines and extra spaces. | Valid names and count are parsed correctly; blank lines disappear. |
| `AC-11` | Spin and select **Keep**. | Student remains eligible for future spins; no automatic exclusion occurs. |
| `AC-12` | Spin and select **Remove**. | Student is absent from all subsequent wheel selections in that session. |
| `AC-13` | Select **Spin Again** before Keep/Remove. | A new valid result is shown; roster is unchanged by the discarded result. |
| `AC-14` | Remove all students and advance to another wheel stage. | No broken/empty spin; Restore All Students is available. |
| `AC-15` | Display a question before clicking Reveal Answer. | Correct option, Supporting Passage, and Key Evidence are all hidden. |
| `AC-16` | Click Reveal Answer. | Exactly one correct option is identified; only that question's evidence appears (Supporting Passage if set, plus Key Evidence). |
| `AC-17` | Click Next Question. | Progress increments by one; wheel returns; answer/evidence are hidden. |
| `AC-18` | Complete the final question. | Lesson Complete offers Teach Again and Back to My Readings. |
| `AC-19` | Switch to full screen on a projector. | Question, passage, choices, wheel, and teacher actions remain readable. |
| `AC-20` | Inspect all UI strings. | No Vietnamese or mixed-language UI text is present. |

---

## 11. Suggested implementation sequence

1. **Models and storage:** reading/question/option/range models, draft persistence, readiness validation.
2. **Library:** create/edit/delete/start actions.
3. **Editor:** entire passage input, dynamic answers, question ordering.
4. **Two-level evidence:** selection-to-range mapping, containment rules, independent per-question styling, invalidation safeguards.
5. **Teaching setup and wheel:** name parsing, random selection, Keep/Remove, zero-active recovery.
6. **Teaching player:** hidden/revealed states, answer/evidence rendering, ordered progression, full-screen mode.
7. **Polish and validation:** usability, accessibility, projector check, cross-screen visual consistency, acceptance tests.

---

## 12. Open items intentionally deferred

The following decisions are **not prerequisites** for implementing the agreed MVP: backend framework, deployment host, database engine, sign-in, roster reuse, session analytics, additional question types, multiple supporting excerpts per question, and AI-assisted authoring.

The UI design direction and the English copy inventory are specified separately in [`UI_SPEC.md`](./UI_SPEC.md). In case of conflict, **this document controls product behavior**; `UI_SPEC.md` controls visual presentation and interaction affordances.
