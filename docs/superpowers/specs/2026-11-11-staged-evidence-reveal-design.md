# Staged Evidence Reveal — Design

**Date:** 2026-11-11
**Status:** Proposed
**Spec:** `docs/MVP_SPEC.md` v2.3 → v2.4

## Intent

Students read the passage in their book. The projected screen should not hand them the answer, the excerpt, or the evidence at once. The teacher runs a three-step justification:

1. The student answers verbally; the teacher reveals only the correct option.
2. The teacher asks which part of the text supports the answer; the excerpt appears plain.
3. The teacher asks which words support the answer; Key Evidence appears inside the excerpt.

This turns the reveal into a teaching scaffold instead of one combined spoiler.

## Flow

| Step | Phase | Screen | Primary CTA |
| --- | --- | --- | --- |
| 1 | `question` | Question + options. No excerpt, no correct answer, no evidence. | **Reveal Answer** |
| 2 | `answer` | Correct option highlighted. Excerpt and evidence still hidden. | **Show Excerpt** |
| 3 | `excerpt` | Current question's excerpt shown as plain text; no marks. | **Show Key Evidence**, or **Next Question** / **Finish Lesson** when the question has no Key Evidence |
| 4 | `evidence` | Excerpt with the current question's Key Evidence emphasized. | **Next Question** / **Finish Lesson** |

The correct option stays visible from step 2 onward. The selected student's name stays visible throughout.

## State machine

```text
question --REVEAL_ANSWER--> answer
answer   --SHOW_EXCERPT-->  excerpt
excerpt  --SHOW_EVIDENCE--> evidence
excerpt  --NEXT-->          spin | completed   (only when the question has no Key Evidence)
evidence --NEXT-->          spin | completed
```

- `REVEAL_ANSWER` is accepted only in `question`; `SHOW_EXCERPT` only in `answer`; `SHOW_EVIDENCE` only in `excerpt`; `NEXT` only in `excerpt` or `evidence`. Any other action is a no-op, matching the current reducer.
- `NEXT` from `excerpt` exists only for questions with zero Key Evidence. The UI never offers Next in `excerpt` when evidence exists.
- `NEXT` resets `selectedStudentId` to `null` and returns to `spin`; the reveal step is encoded in the phase, so no extra reveal flag needs clearing.
- On the final question, `NEXT` goes to `completed`.

## UI behavior

- `#stage-question` is visible for all four phases.
- `#teach-excerpt-panel` is hidden in `question` and `answer`; it shows the plain excerpt in `excerpt`; it shows the excerpt with Key Evidence marks in `evidence`.
- The correct option receives the revealed styling from `answer` onward.
- One primary advance button (`#btn-reveal`) changes label and action per phase:
  - `question` → **Reveal Answer** → `REVEAL_ANSWER`
  - `answer` → **Show Excerpt** → `SHOW_EXCERPT`
  - `excerpt` with evidence → **Show Key Evidence** → `SHOW_EVIDENCE`
  - `excerpt` without evidence and `evidence` → button hidden
- `#btn-next` is visible only in `excerpt` without evidence and in `evidence`; its label is **Next Question**, or **Finish Lesson** on the last question.
- No extra on-screen teacher prompt (for example, “Which part…?”). The CTA labels carry the step; the projected screen stays clean.
- No layout, typography, or color-token changes beyond the new button labels.

## Data and persistence

No schema, storage-key, or migration change. `Question.keyEvidence` is already optional, and every ready question already has a non-empty excerpt. Session state remains in memory only.

## Documentation

- `docs/MVP_SPEC.md` v2.4: TCH-03 through TCH-07, the §7 phase table, Scenario B, AC-15 through AC-17.
- `docs/UI_SPEC.md` v1.3: TCH-02/TCH-03 screens, navigation map, screenshot manifest, visual checklist.
- `AGENTS.md`: primary flow and the invariant “no excerpt, answer, or evidence before its reveal step”.

## Tests

- Unit (`tests/logic.test.js`): the full chain `question → answer → excerpt → evidence → completed`; invalid actions are no-ops; `NEXT` from `excerpt` is allowed only as the no-evidence path; roster behavior unchanged.
- Browser sweep (`rf_e2e.py`): step 1 shows no excerpt/correct answer/evidence; step 2 shows the correct option but no excerpt; step 3 shows the plain excerpt with zero marks; step 4 adds only the current question's Key Evidence; a question with no evidence skips step 4; Next resets to the wheel.
- No DOM unit tests; the sweep owns rendering.

## Non-goals

Undo/back navigation, automatic timers, on-screen teacher prompts, presenter notes, per-step analytics, and changing the editor.

## Risks

- A teacher can click through the steps quickly, which is acceptable: the app enforces order, not pacing.
- Students without the book cannot answer; this is already the agreed classroom model.

## Left to the builder

Button styling reuses the existing primary/secondary styles. No open design questions.
