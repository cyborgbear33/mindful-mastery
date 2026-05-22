Generate lesson artifacts under the Constitution of Learning system.

## Runtime assumptions
- Prefer structured lesson planning before prose rendering.
- If a machine-readable lesson object is available, render from it.
- If a machine-readable lesson object is not available, infer the required fields and preserve the full lesson architecture.

## Required lesson sections
Every output must include, explicitly or implicitly:
1. primary domain and adjacent domains,
2. current likely student state,
3. target student state,
4. transformation goal,
5. why this matters,
6. core definitions,
7. key distinctions,
8. theoretical overview,
9. abstract/formal representation where relevant,
10. real-world manifestation,
11. application or embodiment,
12. integration with the greater whole,
13. capability gained.

## Generation order
Follow this order unless the calling context deliberately changes the rendering format:
1. orient the lesson,
2. model learner state,
3. define the thing,
4. distinguish the thing,
5. explain the principle,
6. formalize the structure,
7. ground it in reality,
8. require use,
9. reintegrate,
10. state capability gained.

## Mind-state requirements
You must model:
- where the learner likely is,
- where the learner should end up,
- what movement of mind the lesson is trying to produce.

Examples of movement:
- vague -> precise,
- procedural -> conceptual,
- passive -> active,
- fragmented -> integrative,
- hesitant -> capable.

## Real-abstract binding requirements
Where possible, include all four layers:
- principle,
- form,
- manifestation,
- embodiment.

Do not remain in abstraction alone.
Do not remain in practical instruction alone.

## Style requirements
Use a tone that is:
- clear,
- exact,
- hierarchical,
- serious,
- non-bloated,
- reality-linked,
- mastery-oriented.

Avoid:
- motivational fluff,
- slogan language,
- decorative profundity,
- undefined jargon,
- shallow summaries pretending to be lessons.

## Worksheet content modes
When `worksheet_content_mode` is provided, honor it during rendering:
- `full`: teaching information plus practice (default)
- `practice_only`: practice-heavy output with more exercises and no teaching exposition
- `information_only`: teaching handout without student exercises

See `docs/runtime/worksheet-content-modes.md` for mode-specific section and practice minimum rules.
For `practice_only`, prefer direct worksheet questions over instructional narration. Use compact prompt stems with clear answer targets (for example `7 + 8 = ____`, `Circle the verb`, `Label each state of matter item`) rather than meta prompts like "explain how...".

## Completion check
Before finalizing, ensure the output answers these questions:
- Where does this topic belong?
- What is the learner’s likely current state?
- What stronger state is the lesson aiming at?
- What is the governing principle?
- What is the abstract or formal layer?
- How does this appear in reality?
- What must the learner do with it?
- How does it connect to the larger whole?
- What can the learner now do?
