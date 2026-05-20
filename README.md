# AI Learning System

A constitution-bound AI lesson-generation system designed to form understanding rather than merely present information.

## What this repository is
This repository implements a governed educational generation system built on:
- a master educational constitution,
- an implementation doctrine,
- a machine-readable lesson spec,
- a strict JSON Schema validator,
- a lesson-generation prompt contract,
- a runtime orchestration pipeline,
- an audit rubric,
- and golden example packs.

The system is designed to generate lessons, units, study guides, curriculum segments, and related artifacts with explicit attention to:
- the student’s current state of mind,
- the student’s target state of mind,
- real and abstract integration,
- theoretical overview,
- practical application,
- and capability gained.

## Core idea
The system should not respond to educational requests by free-form prompting alone.

Instead, it should:
1. interpret the request,
2. model the learner,
3. build a structured lesson object,
4. validate the structure,
5. render the lesson,
6. audit the result,
7. persist the structured and rendered outputs.

## Runtime summary
1. Intake request
2. Normalize request
3. Infer learner state
4. Build lesson spec object
5. Validate object against schema
6. Render lesson
7. Audit lesson
8. Persist outputs

## Repository map
- `AGENTS.md` — root directive and authority map for AI systems and developers
- `docs/constitution/` — governing doctrine and educational philosophy
- `docs/runtime/` — runtime contract, orchestration, and integration guidance
- `docs/audits/` — audit rubric and evaluation logic
- `docs/examples/` — canonical examples and golden references
- `schemas/` — machine-readable lesson spec and JSON Schema
- `prompts/` — deployable prompt assets
- `src/` — implementation code
- `tests/` — schema, rendering, audit, and regression tests
- `examples/` — sample lesson objects and rendered lesson outputs

## Start here
Read in this order:
1. `AGENTS.md`
2. `docs/constitution/master-constitution-of-learning.md`
3. `docs/constitution/implementation-doctrine-for-ai-lesson-generation.md`
4. `docs/runtime/lesson-generation-prompt-contract.md`
5. `schemas/machine-readable-lesson-generation-spec.yaml`
6. `schemas/lesson-generation.schema.json`
7. `docs/runtime/lesson-runtime-orchestration-spec.md`
8. `docs/audits/lesson-constitutional-audit-rubric.md`
9. `docs/examples/golden-lesson-spec-example-pack.md`

## Development principle
Structure first, prose second.

The model should render from a validated lesson object whenever practical.

## Current status
This repository implements the constitutional learning architecture with a runnable TypeScript monorepo:

- `packages/common` — lesson pipeline, schema validation, prompt assembly, audit
- `packages/config` — environment schema
- `apps/api` — NestJS API with `POST /lesson/generate` and Cursor SDK adapter
- `apps/web` — Next.js UI for worksheet generation and transparency tabs
- `examples/lesson-spec-instances/` — golden JSON lesson specs for regression

### Quick start

```bash
pnpm install
cp .env.example .env   # set CURSOR_API_KEY for live generation
pnpm dev:app           # API on :4000, web on :3000
```

Run tests without an API key (uses deterministic fake adapter):

```bash
pnpm test
```

Structure first, prose second. Phase 1 render target is the **student worksheet** (Markdown).
