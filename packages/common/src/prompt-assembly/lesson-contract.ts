import {
  GuidanceSnippet,
  LearnerModel,
  LessonPlanObject,
  NormalizedRequest,
  OutputType,
  REQUIRED_WORKSHEET_SECTIONS,
  ReasoningContext,
  WorksheetOutputContract
} from "../lesson-types";

const BASE_OUTPUT_REQUIREMENTS = [
  "clear worksheet structure with markdown headings",
  "exercises traceable to lesson_blueprint.application_and_embodiment",
  "learner orientation showing current to target state movement",
  "definitions and distinctions usable in worksheet format",
  "capability checkpoint aligned with capability_statement"
];

const WORKSHEET_OUTPUT_CONTRACT: WorksheetOutputContract = {
  required_sections: [...REQUIRED_WORKSHEET_SECTIONS],
  markdown_required: true,
  min_heading_count: 8,
  min_output_requirement_coverage: 0.6,
  worksheet_response_format: "auto"
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
  worksheetResponseFormat: NormalizedRequest["worksheet_response_format"]
): WorksheetOutputContract => ({
  ...WORKSHEET_OUTPUT_CONTRACT,
  worksheet_response_format: worksheetResponseFormat
});

export const buildPromptPackage = (input: BuildPromptPackageInput): PromptPackage => {
  const guidanceCharsUsed = input.guidanceSnippets.reduce(
    (sum, snippet) => sum + snippet.excerpt.length,
    0
  );
  const outputContract = buildWorksheetOutputContract(
    input.normalizedRequest.worksheet_response_format
  );

  const reasoningContext: ReasoningContext = {
    topic: input.normalizedRequest.topic,
    requested_output_type: input.normalizedRequest.requested_output_type,
    lesson_plan: input.lessonPlan,
    learner_model: input.learnerModel,
    output_requirements: BASE_OUTPUT_REQUIREMENTS,
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
    `Depth: ${input.normalizedRequest.requested_depth}`,
    `Worksheet response format: ${input.normalizedRequest.worksheet_response_format}`,
    input.normalizedRequest.explicit_audience
      ? `Audience: ${input.normalizedRequest.explicit_audience}`
      : "",
    input.normalizedRequest.user_constraints.length > 0
      ? `User constraints:\n${input.normalizedRequest.user_constraints.map((c) => `- ${c}`).join("\n")}`
      : "",
    "",
    "Required worksheet sections (use Markdown ## headings exactly):",
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
    `Depth: ${input.normalizedRequest.requested_depth}`,
    `Source request:\n${input.normalizedRequest.source_request_text}`,
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

export const evaluateWorksheetContract = (
  worksheet: string,
  reasoningContext: ReasoningContext
): { valid: boolean; issues: string[]; metrics: { heading_count: number; required_section_coverage: number } } => {
  const issues: string[] = [];
  const headingMatches = worksheet.match(/^#{1,6}\s+.+$/gm) ?? [];
  const headingCount = headingMatches.length;
  const contract = reasoningContext.output_contract;

  if (!worksheet.trim()) {
    issues.push("Worksheet is empty.");
  }

  if (contract.markdown_required && headingCount < contract.min_heading_count) {
    issues.push(
      `Insufficient markdown headings (${headingCount} < ${contract.min_heading_count}).`
    );
  }

  const normalizedWorksheet = worksheet.toLowerCase();
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
