# Integration Guide
## How to Wire the Constitution-Bound Lesson System into Software

---

## Purpose
This guide explains how developers should integrate the governing learning documents, machine-readable lesson spec, validators, prompting assets, and audit logic into a working application.

The goal is not to prompt a model loosely. The goal is to operate a governed lesson pipeline.

---

## Recommended load order
When the system boots, load conceptual authority in this order:
1. `AGENTS.md`
2. `docs/constitution/master-constitution-of-learning.md`
3. `docs/constitution/implementation-doctrine-for-ai-lesson-generation.md`
4. `docs/runtime/lesson-generation-prompt-contract.md`
5. `schemas/machine-readable-lesson-generation-spec.yaml`
6. `schemas/lesson-generation.schema.json`
7. `docs/runtime/lesson-runtime-orchestration-spec.md`
8. `docs/audits/lesson-constitutional-audit-rubric.md`
9. `docs/examples/golden-lesson-spec-example-pack.md`

Use the first four primarily for model behavior and planning rules.
Use the schema for validation.
Use the orchestration spec for pipeline design.
Use the audit rubric after rendering.
Use the golden examples for testing, prompting, and regression checks.

---

## Recommended runtime pipeline
### 1. Request intake
Receive the raw user request and capture:
- topic,
- requested output type,
- explicit audience,
- explicit learner state,
- explicit constraints,
- desired depth.

### 2. Request normalization
Convert raw request into internal structured fields.
Map the request into lesson-generation spec fields where possible.

### 3. Learner-state inference
If the user did not provide a complete learner model, infer conservatively:
- current state,
- target state,
- transformation goal,
- likely confusions,
- likely strengths.

### 4. Lesson object planning
Construct a machine-readable lesson object using the YAML spec as the semantic model.

### 5. Schema validation
Validate the lesson object against `lesson-generation.schema.json`.
If validation fails, repair or regenerate before rendering.

### 6. Prompt assembly
Assemble the rendering prompt from:
- system prompt,
- developer prompt,
- validated lesson object,
- optional user-facing constraints.

Avoid passing only the raw user request when a structured lesson object exists.

### 7. Lesson rendering
Render the lesson from the validated object.
Preserve section order and constitutional completeness.

### 8. Post-render audit
Evaluate the rendered lesson using the audit rubric.
If the lesson fails major checks, revise and rerun audit.

### 9. Persistence
Store:
- normalized request,
- learner model,
- validated lesson object,
- rendered lesson,
- audit result,
- lineage/version metadata.

---

## Suggested software module layout
- `src/intake/` — receives requests
- `src/normalization/` — normalizes request into structured fields
- `src/learner-model/` — infers current and target learner state
- `src/planning/` — constructs the lesson object
- `src/validation/` — validates against JSON Schema
- `src/rendering/` — renders lesson prose
- `src/auditing/` — applies rubric and produces audit results
- `src/persistence/` — stores artifacts and lineage

---

## Suggested object flow
### Input object
Raw request and optional explicit profile data.

### Internal planning object
A lesson object conforming conceptually to the machine-readable lesson generation spec.

### Validation result
Schema pass or fail plus repair notes.

### Rendered output
Human-readable lesson artifact.

### Audit result
Scored rubric output and approval status.

---

## Prompting recommendations
### System prompt
Use `prompts/system/constitution-bound-lesson-architect.system.md` as the high-level role and behavior constraint.

### Developer prompt
Use `prompts/developer/lesson-generation.developer.md` to enforce runtime section requirements and generation order.

### User prompt
Use the user request plus normalized context and validated lesson object.

### Best practice
Pass the lesson object or a structured digest of it into the model so the model renders from structure rather than improvising the lesson architecture.

---

## Validation and audit recommendations
### Validation
Use JSON Schema validation before lesson rendering whenever possible.

### Audit
Use the audit rubric after rendering.
Do not treat schema validity as proof of educational quality.
A structurally valid lesson can still be hollow.

---

## Golden-example usage
Use the golden lesson examples for:
- few-shot prompting,
- regression tests,
- benchmark comparisons,
- example-driven alignment,
- and review calibration.

Do not treat golden examples as higher authority than doctrine.
They are standards of comparison, not the crown.

---

## Deployment guidance
### Minimum viable production flow
1. normalize request,
2. infer learner state,
3. construct lesson object,
4. validate lesson object,
5. render lesson,
6. audit lesson,
7. persist results.

### Stronger production flow
Add:
- regeneration on audit failure,
- versioned lesson lineage,
- human approval queue for flagged outputs,
- regression testing against golden examples,
- and monitoring for missing-section drift.

---

## Final integration principle
Do not let the model invent the architecture of the lesson at runtime without constraint.

Build structure first.
Validate it.
Render from it.
Audit the result.

That is how the system stays governed.
