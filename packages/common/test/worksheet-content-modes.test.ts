import { describe, expect, it } from "vitest";
import {
  buildWorksheetOutputContract,
  evaluateWorksheetContract
} from "../src/prompt-assembly/lesson-contract";
import { createFakePipeline } from "../src/orchestrator/lesson-pipeline";
import { getWorksheetModeDefinition } from "../src/worksheet/worksheet-content-modes";

describe("worksheet content modes", () => {
  it("defines teacher-friendly mode metadata", () => {
    expect(getWorksheetModeDefinition("practice_only").practice_minimums.exercises).toBe(6);
    expect(getWorksheetModeDefinition("information_only").omit_practice_sections).toBe(true);
  });

  it("builds mode-specific output contracts", () => {
    const practiceContract = buildWorksheetOutputContract("auto", "practice_only");
    expect(practiceContract.omit_information_sections).toBe(true);
    expect(practiceContract.required_sections).toContain("Guided Exercises");
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

    expect(response.worksheet.toLowerCase()).toContain("guided exercises");
    expect(response.worksheet.toLowerCase()).not.toContain("core definitions");
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
        lesson_plan: {} as never,
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
});
