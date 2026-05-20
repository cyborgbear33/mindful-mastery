# Lesson Runtime Orchestration Spec
## Execution Architecture for a Constitution-Bound AI Learning System

---

## Purpose

This document defines the runtime orchestration architecture for an AI lesson-generation system governed by the Constitution of Learning, the Implementation Doctrine, the Machine-Readable Lesson Generation Spec, the JSON Schema validator, and the Lesson Generation Prompt Contract.

Its purpose is to ensure that lesson generation is not a loose prompt-response event, but a governed pipeline with explicit stages, validation boundaries, audit points, and fallback behavior.

This is the runtime skeleton of the system.

---

# Part I. Governing Runtime Principle

The system shall not generate lessons by sending raw user requests directly to a general model and accepting whatever comes back.

Instead, the system shall treat lesson generation as a controlled transformation pipeline:

1. receive request,
2. normalize and interpret it,
3. infer or collect missing instructional state,
4. construct a constitutional lesson object,
5. validate the object,
6. render instructional output,
7. audit the rendered output,
8. store both the structured lesson plan and the rendered lesson.

This keeps the machine from wandering into educational mush.

---

# Part II. Core Runtime Components

## 1. Request Intake Layer
Responsible for receiving the incoming lesson request.

## 2. Request Normalization Layer
Responsible for converting raw requests into structured internal fields.

## 3. Learner-State Inference Layer
Responsible for modeling the present and target condition of the learner’s mind.

## 4. Constitutional Planning Layer
Responsible for constructing the internal lesson plan object before any final prose is rendered.

## 5. Schema Validation Layer
Responsible for structural validation of the lesson object.

## 6. Constitutional Rendering Layer
Responsible for converting the validated lesson object into human-readable educational output.

## 7. Post-Render Constitutional Audit Layer
Responsible for checking whether the rendered lesson still obeys the constitution after prose generation.

## 8. Persistence Layer
Responsible for storing both the internal object and the rendered lesson.

---

# Part III. Canonical Runtime Pipeline

## Stage 1. Intake
Receive request.

## Stage 2. Normalize
Convert raw request into structured generation context.

## Stage 3. Infer learner state
Construct current-state and target-state model.

## Stage 4. Build lesson object
Generate machine-readable lesson spec instance.

## Stage 5. Validate
Check lesson object against JSON Schema.

## Stage 6. Render
Generate human-readable lesson.

## Stage 7. Audit
Check rendered lesson against constitutional requirements.

## Stage 8. Persist
Store all artifacts and metadata.

## Stage 9. Deliver
Return lesson to user or downstream educational system.

---

# Part IV. Suggested Internal Data Contracts

## A. Normalized Request Object
Should include:
- request_id,
- timestamp,
- topic,
- requested_output_type,
- user_constraints,
- explicit_audience,
- explicit_domain,
- explicit_student_state,
- requested_depth,
- source_request_text.

## B. Learner Model Object
Should include:
- current_state,
- target_state,
- transformation_goal,
- learner_constraints,
- learner_strengths,
- confidence_of_inference.

## C. Lesson Plan Object
Should conform to the machine-readable lesson generation spec.

## D. Audit Object
Should include:
- audit_id,
- lesson_id,
- schema_pass,
- constitutional_pass,
- missing_sections,
- fragmentation_risk,
- drift_notes,
- recommended_revision_actions.

---

# Part V. Fallback and Recovery Behavior

## 1. Missing user information
If the user omits student state, domain placement, or lesson depth:
- infer conservatively,
- continue with explicit assumptions,
- preserve full lesson structure.

## 2. Validation failure
If schema validation fails:
- attempt structured regeneration,
- do not emit invalid lesson object as canonical output.

## 3. Rendering drift
If the rendered lesson loses constitutional sections:
- re-render from the validated object,
- do not allow the prose model to replace structure with polish.

## 4. Audit failure
If post-render audit fails:
- trigger revision,
- patch missing sections,
- rerun audit before delivery.

---

# Part VI. Recommended Model Roles

A strong implementation may use distinct internal roles or stages.
- Interpreter
- Learner-State Modeler
- Lesson Planner
- Validator
- Renderer
- Auditor

This separation reduces slop, hallucinated structure, and content drift.

---

# Part VII. Runtime Quality Gates

The system should not deliver a lesson unless the following gates are passed.
- Structural Gate
- Constitutional Gate
- Real-Abstract Gate
- Capability Gate
- Integration Gate

---

# Part VIII. Runtime Metrics

The system should track metrics such as:
- schema validation pass rate,
- audit pass rate,
- average fragmentation risk,
- average regeneration count,
- missing-section frequency,
- learner-state inference confidence,
- lesson reuse rate,
- curriculum linkage density,
- post-hoc human approval rate.

These metrics show whether the system is generating disciplined instruction or polished junk.

---

# Part IX. Minimal Reference Flow

A minimal but sound runtime flow is:

1. user asks for lesson,
2. system normalizes request,
3. system infers learner model,
4. planner creates lesson spec object,
5. schema validates object,
6. renderer generates lesson text,
7. auditor checks final lesson,
8. system stores and returns the result.

That is the minimum viable serious pipeline.

---

# Part X. Final Runtime Directive

Do not let the model improvise the architecture of learning on the fly.

Build the lesson object first.
Validate it.
Render from it.
Audit the output.
Store the lineage.

Structure first, prose second.
That is how the system remains faithful.
