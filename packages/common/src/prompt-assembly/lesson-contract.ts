import {
  GuidanceSnippet,
  LearnerModel,
  LessonPlanObject,
  NormalizedRequest,
  OutputType,
  ReasoningContext,
  WorksheetContentMode,
  WorksheetOutputContract
} from "../lesson-types";
import { getWorksheetModeDefinition } from "../worksheet/worksheet-content-modes";

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
    "include both teaching information and a substantial practice block"
  ],
  practice_only: [
    "render only practice-oriented sections — no long teaching exposition",
    "include a brief title and short learner orientation only",
    "populate guided exercises heavily from worksheet_blueprint",
    "include at least six guided exercises when depth is standard or advanced",
    "include observation, reflection, self-check, and capability checkpoint sections",
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
    "Render a practice-focused worksheet. Keep orientation brief (2-4 lines). Prioritize quantity and variety of practice problems. Omit teaching-heavy sections.",
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
  worksheetContentMode: NormalizedRequest["worksheet_content_mode"] = "full"
): WorksheetOutputContract => {
  const modeDefinition = getWorksheetModeDefinition(worksheetContentMode);

  return {
    required_sections: [...modeDefinition.required_sections],
    markdown_required: true,
    min_heading_count: modeDefinition.min_heading_count,
    min_output_requirement_coverage: modeDefinition.min_output_requirement_coverage,
    worksheet_response_format: worksheetResponseFormat,
    worksheet_content_mode: worksheetContentMode,
    practice_minimums: { ...modeDefinition.practice_minimums },
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
    contentMode
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
    `Topic: ${input.normalizedRequest.topic}`,
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
      ? `Practice minimums: ${outputContract.practice_minimums.exercises} guided exercises, ${outputContract.practice_minimums.observation_tasks} observation tasks, ${outputContract.practice_minimums.reflection_prompts} reflection prompts, ${outputContract.practice_minimums.self_check_items} self-check items.`
      : "",
    "",
    "Required worksheet sections (use Markdown ## headings that clearly match these):",
    ...outputContract.required_sections.map((section, index) => `${index + 1}) ${section}`),
    "",
    "Use the separate reasoning_context input as mandatory context.",
    "Render exercises from lesson_blueprint.worksheet_blueprint — do not invent generic filler.",
    "Do not restate the JSON context verbatim. Produce a usable student worksheet.",
    "Return only the final worksheet content in Markdown."
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

  return [
    input.systemPrompt ?? "You are a constitution-bound lesson architect.",
    "",
    input.developerPrompt ?? "Build a complete machine-readable lesson object.",
    "",
    "Task: Produce a JSON lesson plan object conforming to the lesson generation schema.",
    "Include all required top-level keys: spec_metadata, constitutional_alignment, generation_context,",
    "student_model, topic_model, lesson_blueprint (with worksheet_blueprint), quality_controls.",
    "",
    `Topic: ${input.normalizedRequest.topic}`,
    `Request ID: ${input.normalizedRequest.request_id}`,
    `Output type: ${input.normalizedRequest.requested_output_type}`,
    `Worksheet content mode: ${modeDefinition.label} (${modeDefinition.mode})`,
    `Depth: ${input.normalizedRequest.requested_depth}`,
    `Source request:\n${input.normalizedRequest.source_request_text}`,
    "",
    "Worksheet blueprint minimums for this mode:",
    `- exercises: ${modeDefinition.practice_minimums.exercises}`,
    `- observation_tasks: ${modeDefinition.practice_minimums.observation_tasks}`,
    `- reflection_prompts: ${modeDefinition.practice_minimums.reflection_prompts}`,
    `- self_check_items: ${modeDefinition.practice_minimums.self_check_items}`,
    modeDefinition.mode === "practice_only"
      ? "For practice_only mode, still build the full lesson_blueprint layers internally, but make worksheet_blueprint especially rich with varied, concrete practice items."
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

const countNumberedItems = (sectionText: string): number =>
  (sectionText.match(/^\s*\d+\.\s+/gm) ?? []).length;

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

  if (!contract.omit_practice_sections) {
    const exerciseSection = extractSectionBody(
      worksheet,
      /^##\s+.*guided exercises.*\n/im
    );
    const exerciseCount = countNumberedItems(exerciseSection);
    if (exerciseCount < contract.practice_minimums.exercises) {
      issues.push(
        `Insufficient guided exercises (${exerciseCount} < ${contract.practice_minimums.exercises}).`
      );
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
