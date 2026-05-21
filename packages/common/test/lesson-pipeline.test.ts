import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateLessonPlan } from "../src/validation/schema-validator";
import { LessonPlanObjectSchema } from "../src/lesson-types";

const goldenDir = resolve(__dirname, "../../../examples/lesson-spec-instances");

describe("golden lesson spec instances", () => {
  const files = ["golden-self-attention.json", "golden-trivium-definition-distinction.json"];

  for (const file of files) {
    it(`validates ${file} against schema and zod`, () => {
      const raw = readFileSync(resolve(goldenDir, file), "utf8");
      const parsed = JSON.parse(raw);
      const result = validateLessonPlan(parsed);
      expect(result.valid, result.errors.join("; ")).toBe(true);
      expect(() => LessonPlanObjectSchema.parse(parsed)).not.toThrow();
    });
  }
});

describe("evaluateWorksheetContract", () => {
  it("accepts worksheet rendered from golden plan", async () => {
    const { createFakePipeline } = await import("../src/orchestrator/lesson-pipeline");
    const pipeline = createFakePipeline();
    const response = await pipeline.generate({
      topic: "Attention as the Gate of Learning",
      requested_output_type: "worksheet",
      explicit_domain: "self",
      requested_depth: "standard",
      worksheet_response_format: "auto",
      worksheet_content_mode: "full",
      user_constraints: []
    });
    expect(response.worksheet).toContain("## Worksheet Title");
    expect(response.worksheet).toContain("— Worksheet");
    expect(response.quality_metrics.worksheet_contract_valid).toBe(true);
    expect(response.audit_result.schema_pass).toBe(true);
  });
});

describe("buildPromptPackage", () => {
  it("includes output contract and lesson plan in reasoning context", async () => {
    const { createFakePipeline } = await import("../src/orchestrator/lesson-pipeline");
    const response = await createFakePipeline().generate({
      topic: "Definition and Distinction",
      requested_output_type: "worksheet",
      explicit_domain: "trivium",
      requested_depth: "standard",
      worksheet_response_format: "auto",
      worksheet_content_mode: "full",
      user_constraints: []
    });
    expect(response.llm_prompt.length).toBeGreaterThan(100);
    expect(response.reasoning_context.output_contract.required_sections.length).toBeGreaterThan(0);
    expect(response.reasoning_context.lesson_plan.spec_metadata.lesson_id).toBeTruthy();
  });
});
