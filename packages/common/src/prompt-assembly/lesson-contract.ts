import {
  GuidanceSnippet,
  LearnerModel,
  LessonPlanObject,
  NormalizedRequest,
  OutputType,
  ReasoningContext,
  WorksheetContentMode,
  WorksheetItem,
  WorksheetOutputContract
} from "../lesson-types";
import { buildPlacementContextLines } from "../normalization/normalize-request";
import {
  PRACTICE_PROBLEM_ANGLES,
  formatPracticeAngleOntologyForPrompt,
  listPracticeAngleLabels
} from "../worksheet/practice-problem-ontology";
import { getWorksheetModeDefinition, resolvePracticeMinimums } from "../worksheet/worksheet-content-modes";

const BASE_OUTPUT_REQUIREMENTS = [
  "clear worksheet structure with markdown headings",
  "exercises traceable to lesson_blueprint.application_and_embodiment",
  "learner orientation showing current to target state movement",
  "definitions and distinctions usable in worksheet format",
  "capability checkpoint aligned with capability_statement"
];

const MODE_OUTPUT_REQUIREMENTS: Record<WorksheetContentMode, string[]> = {
  full: [
    ...BASE_OUTPUT_REQUIREMENTS,
    "include both teaching information and a substantial practice block",
    "guided exercises must use a numbered list (1. 2. 3.) under a Guided Exercises heading"
  ],
  practice_only: [
    "render only practice-oriented sections — no long teaching exposition",
    "include a brief title and short learner orientation only",
    "cover many distinct practice problem angles from the ontology — not six generic prompts",
    "populate worksheet_blueprint with tagged practice_angle values on each item",
    "split core skill drills (Guided Exercises) from multi-step work (Applied Scenarios)",
    "include a dedicated Pencil-and-Paper Workbook Problems section with schoolbook-style exercises",
    "tailor workbook-style problems to the selected domain and subdomain (for example arithmetic/algebra/geometry style for quadrivium math topics)",
    "for math notation, write expressions in LaTeX delimiters ($...$ inline, $$...$$ display) so symbols render correctly",
    "use compact italic type tags (for example _DR_, _PE_) before prompts and render a Problem Type Key at the bottom",
    "do not print raw ontology identifiers such as definition_recall or distinction_judgment in student-facing prompts",
    "prioritize quantity, variety, and concrete use over exposition",
    "do not include core definitions, theoretical overview, or integration teaching sections"
  ],
  information_only: [
    "render only teaching and orientation sections — no student exercises",
    "include definitions, distinctions, theoretical overview, real examples, integration, and capability statement",
    "do not include guided exercises, observation tasks, reflection prompts, or self-check items"
  ]
};

const MODE_RENDER_INSTRUCTIONS: Record<WorksheetContentMode, string> = {
  full: "Render a complete student worksheet with both lesson information and practice problems.",
  practice_only:
    "Render a practice-heavy worksheet. Keep orientation brief (2-4 lines). Cover many problem types and solution angles. Use Guided Exercises for core drills, Applied Scenarios for context, and Pencil-and-Paper Workbook Problems for schoolbook-style practice. Omit teaching-heavy sections.",
  information_only:
    "Render an information handout for teaching or reading. Include definitions, explanations, examples, and integration. Do not include any numbered practice prompts or blank answer spaces."
};

export type BuildPromptPackageInput = {
  normalizedRequest: NormalizedRequest;
  learnerModel: LearnerModel;
  lessonPlan: LessonPlanObject;
  guidanceSnippets: GuidanceSnippet[];
  tokenBudgetChars: number;
  outputType?: OutputType;
  systemPrompt?: string;
  developerPrompt?: string;
};

export type PromptPackage = {
  llmPrompt: string;
  reasoningContext: ReasoningContext;
};

export const buildWorksheetOutputContract = (
  worksheetResponseFormat: NormalizedRequest["worksheet_response_format"],
  worksheetContentMode: NormalizedRequest["worksheet_content_mode"] = "full",
  requestedDepth: NormalizedRequest["requested_depth"] = "standard"
): WorksheetOutputContract => {
  const modeDefinition = getWorksheetModeDefinition(worksheetContentMode);
  const practiceMinimums = resolvePracticeMinimums(worksheetContentMode, requestedDepth);

  return {
    required_sections: [...modeDefinition.required_sections],
    markdown_required: true,
    min_heading_count: modeDefinition.min_heading_count,
    min_output_requirement_coverage: modeDefinition.min_output_requirement_coverage,
    worksheet_response_format: worksheetResponseFormat,
    worksheet_content_mode: worksheetContentMode,
    practice_minimums: practiceMinimums,
    omit_information_sections: modeDefinition.omit_information_sections,
    omit_practice_sections: modeDefinition.omit_practice_sections
  };
};

export const buildPromptPackage = (input: BuildPromptPackageInput): PromptPackage => {
  const guidanceCharsUsed = input.guidanceSnippets.reduce(
    (sum, snippet) => sum + snippet.excerpt.length,
    0
  );
  const contentMode = input.normalizedRequest.worksheet_content_mode;
  const modeDefinition = getWorksheetModeDefinition(contentMode);
  const outputContract = buildWorksheetOutputContract(
    input.normalizedRequest.worksheet_response_format,
    contentMode,
    input.normalizedRequest.requested_depth
  );

  const reasoningContext: ReasoningContext = {
    topic: input.normalizedRequest.topic,
    requested_output_type: input.normalizedRequest.requested_output_type,
    lesson_plan: input.lessonPlan,
    learner_model: input.learnerModel,
    output_requirements: MODE_OUTPUT_REQUIREMENTS[contentMode],
    output_contract: outputContract,
    meta: {
      guidance_used: input.guidanceSnippets,
      token_budget_chars: input.tokenBudgetChars,
      guidance_chars_used: guidanceCharsUsed,
      authority_files_loaded: input.guidanceSnippets.map((s) => s.path)
    }
  };

  const llmPrompt = [
    input.systemPrompt ?? "You are a constitution-bound lesson architect.",
    "",
    input.developerPrompt ?? "Render from the structured lesson object. Do not invent architecture.",
    "",
    "Placement context:",
    ...buildPlacementContextLines(input.normalizedRequest),
    "",
    `Resolved lesson title: ${input.normalizedRequest.topic}`,
    `Output type: worksheet (student-facing Markdown)`,
    `Worksheet content mode: ${modeDefinition.label} (${contentMode})`,
    `Depth: ${input.normalizedRequest.requested_depth}`,
    `Worksheet response format: ${input.normalizedRequest.worksheet_response_format}`,
    input.normalizedRequest.explicit_audience
      ? `Audience: ${input.normalizedRequest.explicit_audience}`
      : "",
    input.normalizedRequest.worksheet_header_name ||
    input.normalizedRequest.worksheet_header_date ||
    input.normalizedRequest.worksheet_header_description
      ? [
          "Worksheet header (render at the very top; omit any blank field):",
          input.normalizedRequest.worksheet_header_name
            ? `- Name: ${input.normalizedRequest.worksheet_header_name}`
            : "",
          input.normalizedRequest.worksheet_header_date
            ? `- Date: ${input.normalizedRequest.worksheet_header_date}`
            : "",
          input.normalizedRequest.worksheet_header_description
            ? `- Notes: ${input.normalizedRequest.worksheet_header_description}`
            : "",
          "Separate the header from the worksheet body with a horizontal rule."
        ]
          .filter(Boolean)
          .join("\n")
      : "",
    input.normalizedRequest.user_constraints.length > 0
      ? `User constraints:\n${input.normalizedRequest.user_constraints.map((c) => `- ${c}`).join("\n")}`
      : "",
    "",
    MODE_RENDER_INSTRUCTIONS[contentMode],
    "",
    "Mode requirements:",
    ...MODE_OUTPUT_REQUIREMENTS[contentMode].map((req, index) => `${index + 1}) ${req}`),
    "",
    contentMode === "practice_only"
      ? [
          `Practice minimums: ${outputContract.practice_minimums.exercises} guided exercises, ${outputContract.practice_minimums.applied_scenarios} applied scenarios, ${outputContract.practice_minimums.observation_tasks} observation tasks, ${outputContract.practice_minimums.self_check_items} self-check items, at least ${outputContract.practice_minimums.min_practice_angles} distinct practice angles.`,
          "",
          "Workbook section requirement: include real pencil-and-paper problems that look like school workbook items for the selected domain/subdomain.",
          "",
          "Practice problem angle ontology (cover as many distinct angles as the minimum requires):",
          formatPracticeAngleOntologyForPrompt(),
          "",
          "Tag each worksheet_blueprint item with practice_angle matching an ontology id.",
          "In student-facing prompts, render only short tags like _DR_ or _PE_ (not raw ids).",
          "Render a Problem Type Key at the bottom mapping each short tag to its full label."
        ].join("\n")
      : "",
    "",
    "Required worksheet sections (use Markdown ## headings that clearly match these):",
    ...outputContract.required_sections.map((section, index) => `${index + 1}) ${section}`),
    "",
    "Use the separate reasoning_context input as mandatory context.",
    "Render exercises from lesson_blueprint.worksheet_blueprint — do not invent generic filler.",
    "Use numbered lists for guided exercises (1. 2. 3.) under a ## Guided Exercises heading.",
    "Do not restate the JSON context verbatim. Produce a usable student worksheet.",
    "Return only the final worksheet content in Markdown.",
    "Never wrap the worksheet in markdown code fences.",
    "Never add preamble commentary before the worksheet body."
  ]
    .filter(Boolean)
    .join("\n");

  return { llmPrompt, reasoningContext };
};

export const buildPlannerPrompt = (input: {
  normalizedRequest: NormalizedRequest;
  learnerModel: LearnerModel;
  guidanceSnippets: GuidanceSnippet[];
  systemPrompt?: string;
  developerPrompt?: string;
  repairErrors?: string[];
}): string => {
  const modeDefinition = getWorksheetModeDefinition(input.normalizedRequest.worksheet_content_mode);
  const practiceMinimums = resolvePracticeMinimums(
    input.normalizedRequest.worksheet_content_mode,
    input.normalizedRequest.requested_depth
  );

  return [
    input.systemPrompt ?? "You are a constitution-bound lesson architect.",
    "",
    input.developerPrompt ?? "Build a complete machine-readable lesson object.",
    "",
    "Task: Produce a JSON lesson plan object conforming to the lesson generation schema.",
    "Include all required top-level keys: spec_metadata, constitutional_alignment, generation_context,",
    "student_model, topic_model, lesson_blueprint (with worksheet_blueprint), quality_controls.",
    "",
    "Placement context:",
    ...buildPlacementContextLines(input.normalizedRequest),
    "",
    `Resolved lesson title: ${input.normalizedRequest.topic}`,
    `Request ID: ${input.normalizedRequest.request_id}`,
    `Output type: ${input.normalizedRequest.requested_output_type}`,
    `Worksheet content mode: ${modeDefinition.label} (${modeDefinition.mode})`,
    `Depth: ${input.normalizedRequest.requested_depth}`,
    `Source request:\n${input.normalizedRequest.source_request_text}`,
    "",
    "Worksheet blueprint minimums for this mode:",
    `- exercises: ${practiceMinimums.exercises}`,
    `- applied_scenarios: ${practiceMinimums.applied_scenarios}`,
    `- observation_tasks: ${practiceMinimums.observation_tasks}`,
    `- reflection_prompts: ${practiceMinimums.reflection_prompts}`,
    `- self_check_items: ${practiceMinimums.self_check_items}`,
    `- min_practice_angles: ${practiceMinimums.min_practice_angles}`,
    modeDefinition.mode === "practice_only"
      ? [
          "For practice_only mode, still build the full lesson_blueprint layers internally, but make worksheet_blueprint dense with varied, concrete practice items.",
          "Each worksheet item must include practice_angle from the ontology. Use applied_scenarios for multi-step and contextual items.",
          "Include enough concrete arithmetic/algebra-style items to support a Pencil-and-Paper Workbook Problems section in rendering.",
          "Tune examples to the selected domain/subdomain instead of generic prompts.",
          "",
          "Practice problem angle ontology:",
          formatPracticeAngleOntologyForPrompt()
        ].join("\n")
      : "",
    modeDefinition.mode === "information_only"
      ? "For information_only mode, still include worksheet_blueprint in the JSON for schema compliance, but keep practice items minimal; teaching content belongs in lesson_blueprint layers."
      : "",
    "",
    "Learner model:",
    JSON.stringify(input.learnerModel, null, 2),
    "",
    input.repairErrors?.length
      ? `Fix these schema validation errors:\n${input.repairErrors.map((e, i) => `${i + 1}) ${e}`).join("\n")}`
      : "",
    "",
    "Return ONLY valid JSON. No markdown fences. No commentary."
  ]
    .filter(Boolean)
    .join("\n");
};

export const buildRepairPrompt = (input: {
  originalPrompt: string;
  originalWorksheet: string;
  issues: string[];
}): string => [
  "Repair the student worksheet to satisfy the output contract.",
  "Keep exercises traceable to the lesson plan. Do not invent new architecture.",
  "",
  "Contract issues to fix:",
  ...input.issues.map((issue, index) => `${index + 1}) ${issue}`),
  "",
  "Original prompt:",
  input.originalPrompt,
  "",
  "Original worksheet:",
  input.originalWorksheet,
  "",
  "Return only the corrected Markdown worksheet."
].join("\n");

const countPracticeItems = (sectionText: string): number => {
  if (!sectionText.trim()) return 0;

  const numbered = (sectionText.match(/^\s*\d+[\.)]\s+/gm) ?? []).length;
  if (numbered > 0) return numbered;

  return (sectionText.match(/^\s*[-*]\s+\S/gm) ?? []).length;
};

const extractExerciseSection = (worksheet: string): string => {
  const headingPatterns = [
    /^#{1,3}\s+.*guided exercises.*$/im,
    /^#{1,3}\s+.*\bexercises\b.*$/im,
    /^#{1,3}\s+.*practice problems.*$/im
  ];

  for (const pattern of headingPatterns) {
    const body = extractSectionBody(worksheet, pattern);
    if (body.trim()) {
      return body;
    }
  }

  return "";
};

const extractAppliedScenarioSection = (worksheet: string): string =>
  extractSectionBody(worksheet, /^#{1,3}\s+.*applied scenarios.*$/im);

const countProblemTypesListed = (worksheet: string): number => {
  const body = extractSectionBody(worksheet, /^#{1,3}\s+.*problem type key.*$/im);
  return (body.match(/^\s*[-*]\s+\S/gm) ?? []).length;
};

const collectBlueprintPracticeItems = (reasoningContext: ReasoningContext): WorksheetItem[] => {
  const blueprint = reasoningContext.lesson_plan.lesson_blueprint.worksheet_blueprint;
  return [
    ...blueprint.exercises,
    ...(blueprint.applied_scenarios ?? []),
    ...blueprint.observation_tasks,
    ...blueprint.self_check_items
  ];
};

const countBlueprintPracticeAngles = (reasoningContext: ReasoningContext): number => {
  const angles = new Set(
    collectBlueprintPracticeItems(reasoningContext)
      .map((item) => item.practice_angle)
      .filter((angle): angle is string => Boolean(angle))
  );
  if (angles.size > 0) return angles.size;

  return listPracticeAngleLabels(collectBlueprintPracticeItems(reasoningContext)).length;
};

const extractSectionBody = (worksheet: string, headingPattern: RegExp): string => {
  const match = worksheet.match(headingPattern);
  if (!match || match.index === undefined) return "";
  const start = match.index + match[0].length;
  const rest = worksheet.slice(start);
  const nextHeading = rest.search(/^##\s+/m);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
};

export const evaluateWorksheetContract = (
  worksheet: string,
  reasoningContext: ReasoningContext
): { valid: boolean; issues: string[]; metrics: { heading_count: number; required_section_coverage: number } } => {
  const issues: string[] = [];
  const headingMatches = worksheet.match(/^#{1,6}\s+.+$/gm) ?? [];
  const headingCount = headingMatches.length;
  const contract = reasoningContext.output_contract;
  const normalizedWorksheet = worksheet.toLowerCase();

  if (!worksheet.trim()) {
    issues.push("Worksheet is empty.");
  }

  if (contract.markdown_required && headingCount < contract.min_heading_count) {
    issues.push(
      `Insufficient markdown headings (${headingCount} < ${contract.min_heading_count}).`
    );
  }

  let sectionsFound = 0;
  for (const section of contract.required_sections) {
    const tokens = section.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    const found = tokens.some((token) => normalizedWorksheet.includes(token));
    if (found) {
      sectionsFound += 1;
    } else {
      issues.push(`Missing or weak section: ${section}`);
    }
  }

  const requiredSectionCoverage =
    contract.required_sections.length > 0
      ? sectionsFound / contract.required_sections.length
      : 0;

  if (requiredSectionCoverage < contract.min_output_requirement_coverage) {
    issues.push(
      `Required section coverage too low (${requiredSectionCoverage.toFixed(2)} < ${contract.min_output_requirement_coverage}).`
    );
  }

  const echoDetected = worksheet.includes('"lesson_plan"') && worksheet.includes('"worksheet_blueprint"');
  if (echoDetected) {
    issues.push("Worksheet appears to echo raw JSON context instead of rendering prose.");
  }

  if (contract.omit_practice_sections) {
    const practiceMarkers = ["guided exercises", "self-check", "reflection prompts"];
    for (const marker of practiceMarkers) {
      if (normalizedWorksheet.includes(marker)) {
        issues.push(`Information-only mode must not include practice section: ${marker}.`);
      }
    }
  }

  if (contract.omit_information_sections) {
    const teachingMarkers = ["core definitions", "theoretical overview", "integration"];
    for (const marker of teachingMarkers) {
      if (normalizedWorksheet.includes(marker)) {
        issues.push(`Practice-only mode must not include teaching section: ${marker}.`);
      }
    }
  }

  if (contract.worksheet_content_mode === "practice_only") {
    const rawOntologyIds = PRACTICE_PROBLEM_ANGLES
      .map((angle) => angle.id)
      .filter((id) => normalizedWorksheet.includes(id));
    if (rawOntologyIds.length > 0) {
      issues.push(
        `Practice-only output must not expose raw ontology IDs: ${rawOntologyIds.slice(0, 5).join(", ")}.`
      );
    }
  }

  if (!contract.omit_practice_sections) {
    const exerciseSection = extractExerciseSection(worksheet);
    let exerciseCount = countPracticeItems(exerciseSection);

    if (exerciseCount < contract.practice_minimums.exercises) {
      const blueprintCount =
        reasoningContext.lesson_plan.lesson_blueprint.worksheet_blueprint.exercises.length;
      if (
        exerciseSection.trim() &&
        blueprintCount >= contract.practice_minimums.exercises
      ) {
        exerciseCount = blueprintCount;
      }
    }

    if (exerciseCount < contract.practice_minimums.exercises) {
      issues.push(
        `Insufficient guided exercises (${exerciseCount} < ${contract.practice_minimums.exercises}).`
      );
    }

    if (contract.practice_minimums.applied_scenarios > 0) {
      const appliedSection = extractAppliedScenarioSection(worksheet);
      let appliedCount = countPracticeItems(appliedSection);
      const blueprintApplied =
        reasoningContext.lesson_plan.lesson_blueprint.worksheet_blueprint.applied_scenarios
          ?.length ?? 0;

      if (
        appliedCount < contract.practice_minimums.applied_scenarios &&
        appliedSection.trim() &&
        blueprintApplied >= contract.practice_minimums.applied_scenarios
      ) {
        appliedCount = blueprintApplied;
      }

      if (appliedCount < contract.practice_minimums.applied_scenarios) {
        issues.push(
          `Insufficient applied scenarios (${appliedCount} < ${contract.practice_minimums.applied_scenarios}).`
        );
      }
    }

    if (contract.practice_minimums.min_practice_angles > 0) {
      const listedAngles = countProblemTypesListed(worksheet);
      const blueprintAngles = countBlueprintPracticeAngles(reasoningContext);
      const angleCoverage = Math.max(listedAngles, blueprintAngles);

      if (angleCoverage < contract.practice_minimums.min_practice_angles) {
        issues.push(
          `Insufficient practice angle coverage (${angleCoverage} < ${contract.practice_minimums.min_practice_angles}).`
        );
      }
    }
  }

  if (contract.worksheet_response_format !== "auto") {
    if (
      contract.worksheet_response_format === "multiple_choice" &&
      !/\b[A-D]\)\s/m.test(worksheet)
    ) {
      issues.push("Worksheet response format requested multiple_choice, but A-D options were not detected.");
    }
    if (
      contract.worksheet_response_format === "true_false" &&
      !/\btrue\/false\b|\btrue or false\b/i.test(worksheet)
    ) {
      issues.push("Worksheet response format requested true_false, but true/false prompts were not detected.");
    }
    if (
      contract.worksheet_response_format === "fill_in" &&
      !/_{3,}/.test(worksheet)
    ) {
      issues.push("Worksheet response format requested fill_in, but blank markers were not detected.");
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    metrics: { heading_count: headingCount, required_section_coverage: requiredSectionCoverage }
  };
};
