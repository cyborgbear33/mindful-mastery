# Repo-Ready AI Learning Implementation Pack
## Repository Structure, File Roles, Load Order, Parent Directive, and Integration Guidance

---

## Purpose

This document defines how to organize the Constitution of Learning system inside a real repository so that developers, models, validators, orchestrators, and auditors all know what each document is for and how the pieces fit together.

Yes, you do want a project-root-level parent directive.

While some of the role separation is already implicit in the documents themselves, a root-level directive is still valuable because it:
- gives the AI a top-down map of authority,
- explains the purpose of each file,
- defines precedence when files conflict,
- prevents random drift or misuse,
- and tells developers how the system is supposed to be wired.

---

## Recommended Repository Structure

```text
ai-learning/
├── README.md
├── AGENTS.md
├── docs/
│   ├── constitution/
│   ├── runtime/
│   ├── audits/
│   └── examples/
├── schemas/
├── prompts/
├── src/
├── tests/
└── examples/
```

---

## Recommended Authority Order

1. `AGENTS.md`
2. Master Constitution of Learning
3. Implementation Doctrine
4. Prompt Contract
5. Machine-Readable Spec + JSON Schema
6. Runtime Orchestration Spec
7. Audit Rubric
8. Golden Example Pack

If a lower-level artifact conflicts with a higher-level one, the higher-level artifact wins.
