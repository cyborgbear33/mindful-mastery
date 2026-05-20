# AGENTS.md

## Purpose of This Repository
This repository implements a constitution-bound AI learning system. Its purpose is to generate lessons, units, study guides, curriculum segments, and related educational artifacts that form understanding rather than merely present information.

This is not a generic educational content generator. It is a governed learning architecture.

AI working in this repository must follow the governing files in the authority order defined below.

---

## Governing Authority Order
If two files appear to conflict, the higher file in this list governs.

1. `AGENTS.md`
2. `docs/constitution/master-constitution-of-learning.md`
3. `docs/constitution/implementation-doctrine-for-ai-lesson-generation.md`
4. `docs/runtime/lesson-generation-prompt-contract.md`
5. `schemas/machine-readable-lesson-generation-spec.yaml`
6. `schemas/lesson-generation.schema.json`
7. `docs/runtime/lesson-runtime-orchestration-spec.md`
8. `docs/audits/lesson-constitutional-audit-rubric.md`
9. `docs/examples/golden-lesson-spec-example-pack.md`

---

## What Each Governing File Is For
- **Master Constitution of Learning**: defines the educational philosophy, first principles, and what must be true of all learning outputs.
- **Implementation Doctrine**: defines how lessons must be structured, including current student state, target state, theoretical overview, abstract structure, real manifestation, application, and integration.
- **Prompt Contract**: defines runtime behavioral rules for lesson-generation models.
- **Machine-Readable Lesson Generation Spec**: defines the semantic lesson object to be planned and populated.
- **JSON Schema**: validates the lesson object structurally.
- **Runtime Orchestration Spec**: defines the execution pipeline, quality gates, and fallback behavior.
- **Audit Rubric**: defines how generated lessons are evaluated for constitutional strength and pedagogical quality.
- **Golden Example Pack**: provides canonical reference examples for few-shot prompting, testing, benchmarking, and regression control.

---

## Repository Intent
All lesson-generation behavior in this repository must be governed by the doctrine that:
- learning is the ordered formation of understanding,
- the learner’s state of mind matters,
- lessons must bind the real and the abstract,
- education must cultivate capability,
- and outputs must be integrated into a larger architecture of knowledge.

---

## Required AI Behavior
Any AI generating, editing, validating, reviewing, or refactoring lesson-related artifacts in this repository must:
- preserve constitutional structure,
- identify or infer primary and adjacent learning domains,
- model the learner’s current state,
- model the learner’s target state,
- state or imply the transformation of mind goal,
- include why the topic matters,
- include core definitions,
- include key distinctions,
- include a theoretical overview,
- include an abstract or formal layer where appropriate,
- include real-world manifestation,
- include application or embodiment,
- include integration with the larger whole,
- and include capability gained.

Do not generate fragmented, fluffy, decorative, purely decontextualized, or pedagogically hollow content.

---

## Required Runtime Sequence
When implementing or extending the lesson engine, prefer this order:
1. normalize request,
2. infer learner state,
3. build machine-readable lesson object,
4. validate lesson object,
5. render human-readable lesson,
6. audit rendered lesson,
7. persist structured and rendered outputs.

Structure first. Prose second.
Validation before delivery.
Audit before approval.

---

## Normative vs Illustrative Files
The following are **normative**:
- `AGENTS.md`
- constitution files
- prompt contract
- machine-readable spec
- JSON Schema
- runtime orchestration spec
- audit rubric

The following are **illustrative / benchmarking-oriented**:
- golden example pack

Illustrative files do not overrule normative files.

---

## Developer Expectations
When adding features, prompts, schemas, validators, pipelines, or rendering logic:
- do not bypass the constitutional flow,
- do not skip learner-state modeling,
- do not render from raw prompt alone when structured planning is available,
- do not remove application or integration layers for convenience,
- do not trade structural fidelity for polished vagueness.

If the system must choose between elegance and faithfulness, choose faithfulness first and refine elegance afterward.

---

## Minimum Lesson Completeness Standard
A lesson is incomplete if it lacks any of the following in substance:
- domain placement,
- current learner state,
- target learner state,
- transformation goal,
- theoretical overview,
- abstract/formal structure,
- real-world manifestation,
- application or embodiment,
- integration,
- capability gained.

---

## Final Repository Directive
This repository exists to build an AI that teaches in an ordered, disciplined, reality-linked, and capability-producing way.

Do not let the system collapse into plausible educational noise.
Build governed understanding.
