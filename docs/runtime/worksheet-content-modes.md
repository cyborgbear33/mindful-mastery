# Worksheet Content Modes
## Runtime Rules for Full, Practice-Only, and Information-Only Outputs

---

## Purpose

Teachers and learners often need different slices of the same governed lesson:

- a **complete worksheet** for a full lesson,
- **practice problems only** for homework, review, warm-ups, or assessment,
- or **lesson information only** for teaching notes, reading assignments, or pre-teaching handouts.

This document defines how the lesson engine must honor `worksheet_content_mode` without breaking constitutional structure.

The planner must still build the full machine-readable lesson object internally. Rendering may omit sections according to the selected mode.

---

## Allowed Modes

### 1. `full` (default)
Render both teaching information and practice.

Required rendered sections:
- Worksheet Title and Domain Placement
- Learner Orientation
- Core Definitions and Distinctions
- Guided Exercises
- Observation / Application Tasks
- Reflection Prompts
- Self-Check
- Capability Checkpoint

Practice minimums at standard depth:
- 3 guided exercises
- 2 observation tasks
- 2 reflection prompts
- 2 self-check items

### 2. `practice_only`
Render a practice-heavy student artifact with minimal orientation.

Required rendered sections:
- Worksheet Title
- Brief Learner Orientation
- Guided Exercises
- Observation / Application Tasks
- Reflection Prompts
- Self-Check
- Capability Checkpoint

Must **not** render teaching-heavy sections such as:
- Core Definitions and Distinctions
- Theoretical Overview
- Integration teaching blocks

Practice minimums at standard depth:
- 6 guided exercises
- 3 observation tasks
- 2 reflection prompts
- 3 self-check items

The renderer should prioritize quantity, variety, and concrete use over exposition.

### 3. `information_only`
Render a teaching or reading handout without student exercises.

Required rendered sections:
- Worksheet Title and Domain Placement
- Learner Orientation
- Core Definitions and Distinctions
- Theoretical Overview
- Real-World Examples
- Integration
- Capability Statement

Must **not** render practice sections such as:
- Guided Exercises
- Observation / Application Tasks
- Reflection Prompts
- Self-Check

---

## Planner Duties

Regardless of mode, the planner must still populate:
- student_model,
- topic_model,
- all lesson_blueprint layers,
- worksheet_blueprint (for schema compliance).

Mode changes **rendering and minimum practice density**, not whether the system plans constitutionally.

When `practice_only` is selected, the planner must make `worksheet_blueprint` especially rich and varied.

When `information_only` is selected, teaching substance must live in lesson_blueprint layers; practice items may remain minimal in the JSON object but must not appear in rendered output.

---

## Renderer Duties

The renderer must:
1. read `worksheet_content_mode` from the normalized request / output contract,
2. include only the sections allowed for that mode,
3. satisfy mode-specific practice minimums when practice is allowed,
4. keep exercises traceable to `lesson_blueprint.worksheet_blueprint`,
5. avoid generic filler prompts.

---

## Contract Evaluation

Output contract evaluation must be mode-aware:
- section coverage uses mode-specific required headings,
- practice minimums apply only when practice sections are allowed,
- forbidden section types fail validation if they appear in the rendered worksheet.

---

## UX Guidance

Present modes in plain teacher language:

| Mode | Teacher label | When to use |
| --- | --- | --- |
| `full` | Complete Worksheet | Full lesson or printable handout with teach + practice |
| `practice_only` | Practice Problems Only | Homework, review, warm-up, quiz prep |
| `information_only` | Lesson Information Only | Reading assignment or teaching notes before activities |

Do not expose internal enum names to end users unless in developer tooling.
