import { describe, expect, it } from "vitest";
import {
  buildPlannerPrompt,
  buildWorksheetOutputContract,
  buildWorksheetResponseFormatPromptLines,
  evaluateWorksheetContract
} from "../src/prompt-assembly/lesson-contract";
import { createFakePipeline } from "../src/orchestrator/lesson-pipeline";
import {
  getWorksheetModeDefinition,
  resolvePracticeMinimums
} from "../src/worksheet/worksheet-content-modes";
import {
  getScaledPracticeMinimums,
  PRACTICE_PROBLEM_ANGLES
} from "../src/worksheet/practice-problem-ontology";

describe("worksheet content modes", () => {
  it("defines teacher-friendly mode metadata", () => {
    expect(getWorksheetModeDefinition("full").practice_minimums.exercises).toBe(6);
    expect(getWorksheetModeDefinition("practice_only").practice_minimums.exercises).toBe(10);
    expect(getWorksheetModeDefinition("information_only").omit_practice_sections).toBe(true);
    expect(PRACTICE_PROBLEM_ANGLES.length).toBeGreaterThanOrEqual(10);
  });

  it("scales practice-only minimums by depth", () => {
    expect(resolvePracticeMinimums("practice_only", "advanced").exercises).toBe(16);
    expect(resolvePracticeMinimums("practice_only", "introductory").min_practice_angles).toBe(6);
    expect(getScaledPracticeMinimums("standard").applied_scenarios).toBe(4);
  });

  it("builds mode-specific output contracts", () => {
    const practiceContract = buildWorksheetOutputContract("auto", "practice_only", "standard");
    expect(practiceContract.omit_information_sections).toBe(true);
    expect(practiceContract.required_sections).toContain("Applied Scenarios");
    expect(practiceContract.required_sections).toContain("Pencil-and-Paper Workbook Problems");
    expect(practiceContract.required_sections).toContain("Problem Type Key");
    expect(practiceContract.practice_minimums.min_practice_angles).toBe(8);
  });

  it("includes response-format guidance in planner and render prompts", () => {
    const fillInLines = buildWorksheetResponseFormatPromptLines("fill_in", { forPlanner: true });
    expect(fillInLines.join("\n").toLowerCase()).toContain("fill-in-the-blank");
    expect(fillInLines.join("\n")).toContain("response_format");

    const plannerPrompt = buildPlannerPrompt({
      normalizedRequest: {
        request_id: "req-format-test",
        timestamp: new Date().toISOString(),
        topic: "Addition Facts",
        requested_output_type: "worksheet",
        requested_depth: "standard",
        worksheet_response_format: "multiple_choice",
        worksheet_content_mode: "practice_only",
        user_constraints: [],
        source_request_text: "Practice only multiple choice"
      },
      learnerModel: {
        current_knowledge_context: "Can count to 20",
        target_knowledge_context: "Can add within 20",
        transformation_goal: "Move from counting to fluent addition",
        readiness_level: "novice",
        inference_confidence: "explicit"
      },
      guidanceSnippets: []
    });

    expect(plannerPrompt).toContain("Worksheet response format: multiple_choice");
    expect(plannerPrompt).toContain("A) B) C) D)");
  });

  it("honors fill_in response format in practice_only worksheets", async () => {
    const response = await createFakePipeline().generate({
      topic: "Addition Facts",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      requested_depth: "standard",
      worksheet_response_format: "fill_in",
      worksheet_content_mode: "practice_only",
      user_constraints: []
    });

    expect(response.worksheet).toMatch(/_{3,}/);
    expect(response.quality_metrics.worksheet_contract_valid).toBe(true);
  });

  it("honors multiple_choice response format in practice_only worksheets", async () => {
    const response = await createFakePipeline().generate({
      topic: "Addition Facts",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      requested_depth: "standard",
      worksheet_response_format: "multiple_choice",
      worksheet_content_mode: "practice_only",
      user_constraints: []
    });

    expect(response.worksheet).toMatch(/\bA\)\s/m);
    expect(response.quality_metrics.worksheet_contract_valid).toBe(true);
  });

  it("generates a practice-only worksheet without teaching sections", async () => {
    const response = await createFakePipeline().generate({
      topic: "Fractions on a Number Line",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      requested_depth: "standard",
      worksheet_response_format: "auto",
      worksheet_content_mode: "practice_only",
      user_constraints: []
    });

    expect(response.worksheet).toContain("# Fractions on a Number Line — Practice");
    expect(response.worksheet).not.toContain("## Worksheet Title");
    expect(response.worksheet.toLowerCase()).toContain("applied scenarios");
    expect(response.worksheet.toLowerCase()).toContain("pencil-and-paper workbook problems");
    expect(response.worksheet).toMatch(/\d+\s*[+\-×÷]\s*\d+\s*=\s*____/);
    expect(response.worksheet).not.toContain("Explain Fractions on a Number Line in your own words");
    expect(response.worksheet).toMatch(/Word problem:|Two-step problem:/);
    expect(response.worksheet).toContain("**Problem:**");
    expect(response.worksheet).toContain("**Scenario:**");
    expect(response.worksheet).toContain("Store scenario:");
    expect(response.worksheet).toContain("Recipe scenario:");
    expect(response.worksheet.toLowerCase()).toContain("problem type key");
    expect(response.worksheet).not.toContain("definition_recall");
    expect(response.worksheet.toLowerCase()).not.toContain("core definitions");
    expect(response.quality_metrics.worksheet_contract_valid).toBe(true);
  });

  it("uses the worksheet title pattern in full mode", async () => {
    const response = await createFakePipeline().generate({
      topic: "Fractions on a Number Line",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      requested_depth: "standard",
      worksheet_response_format: "auto",
      worksheet_content_mode: "full",
      user_constraints: []
    });

    expect(response.worksheet).toContain("# Fractions on a Number Line — Worksheet");
    expect(response.worksheet).toContain("## Worksheet Title");
    expect(response.worksheet).not.toContain("Worksheet Title and Domain Placement");
    expect(response.quality_metrics.worksheet_contract_valid).toBe(true);
  });

  it("generates an information-only worksheet without practice sections", async () => {
    const response = await createFakePipeline().generate({
      topic: "Fractions on a Number Line",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      requested_depth: "standard",
      worksheet_response_format: "auto",
      worksheet_content_mode: "information_only",
      user_constraints: []
    });

    expect(response.worksheet).toContain("# Fractions on a Number Line — Information");
    expect(response.worksheet.toLowerCase()).toContain("theoretical overview");
    expect(response.worksheet.toLowerCase()).not.toContain("guided exercises");
    expect(response.quality_metrics.worksheet_contract_valid).toBe(true);
  });

  it("evaluates practice minimums in contract checks", () => {
    const contract = buildWorksheetOutputContract("auto", "full");
    const invalid = evaluateWorksheetContract(
      "## Guided Exercises\n\n1. One item only",
      {
        topic: "Test",
        requested_output_type: "worksheet",
        lesson_plan: {
          lesson_blueprint: {
            worksheet_blueprint: { exercises: [{ prompt: "a", purpose: "b" }] }
          }
        } as never,
        learner_model: {} as never,
        output_requirements: [],
        output_contract: contract,
        meta: {
          guidance_used: [],
          token_budget_chars: 0,
          guidance_chars_used: 0,
          authority_files_loaded: []
        }
      }
    );

    expect(invalid.valid).toBe(false);
    expect(invalid.issues.some((issue) => issue.includes("guided exercises"))).toBe(true);
  });

  it("accepts alternate exercise numbering formats", () => {
    const contract = buildWorksheetOutputContract("auto", "full");
    const valid = evaluateWorksheetContract(
      [
        "## Worksheet Title",
        "## Learner Orientation",
        "## Core Definitions and Distinctions",
        "## Guided Exercises",
        "1) First exercise",
        "2) Second exercise",
        "3) Third exercise",
        "4) Fourth exercise",
        "5) Fifth exercise",
        "6) Sixth exercise",
        "## Observation / Application Tasks",
        "1. Observe something",
        "## Reflection Prompts",
        "1. Reflect",
        "## Self-Check",
        "1. Check",
        "## Capability Checkpoint",
        "Done"
      ].join("\n\n"),
      {
        topic: "Test",
        requested_output_type: "worksheet",
        lesson_plan: {
          lesson_blueprint: {
            worksheet_blueprint: {
              exercises: [
                { prompt: "a", purpose: "b" },
                { prompt: "c", purpose: "d" },
                { prompt: "e", purpose: "f" },
                { prompt: "g", purpose: "h" },
                { prompt: "i", purpose: "j" },
                { prompt: "k", purpose: "l" }
              ]
            }
          }
        } as never,
        learner_model: {} as never,
        output_requirements: [],
        output_contract: contract,
        meta: {
          guidance_used: [],
          token_budget_chars: 0,
          guidance_chars_used: 0,
          authority_files_loaded: []
        }
      }
    );

    expect(valid.issues.filter((issue) => issue.includes("guided exercises"))).toEqual([]);
  });
});
