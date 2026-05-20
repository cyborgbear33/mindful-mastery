# Test Strategy

This repository should include tests for:
- schema validation,
- prompt contract compliance,
- rendered lesson section completeness,
- audit rubric scoring behavior,
- regression against golden examples.

Minimum recommended test groups:
- `tests/schema/`
- `tests/rendering/`
- `tests/audits/`
- `tests/regression/`

The goal is not merely to test syntax, but to prevent constitutional drift.
