import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LessonPipeline } from "../src/orchestrator/lesson-pipeline";
import { LessonModelAdapter, type GenerateModelInput } from "../src/planning/model-adapter";
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

describe("practice-only fast path", () => {
  it("skips model calls for practice_only worksheet generation", async () => {
    class CountingAdapter extends LessonModelAdapter {
      callCount = 0;

      async generate(_input: GenerateModelInput): Promise<string> {
        this.callCount += 1;
        throw new Error("Model should not be called in fast practice-only path");
      }
    }

    const adapter = new CountingAdapter();
    const pipeline = new LessonPipeline(adapter, { useDeterministicPlan: false });

    const response = await pipeline.generate({
      topic: "Fractions on a Number Line",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      requested_depth: "standard",
      worksheet_response_format: "auto",
      worksheet_content_mode: "practice_only",
      user_constraints: []
    });

    expect(adapter.callCount).toBe(0);
    expect(response.quality_metrics.worksheet_contract_valid).toBe(true);
    expect(response.worksheet).toContain("Pencil-and-Paper Workbook Problems");
  });

  it("uses planning call but skips render model call for information_only", async () => {
    class CountingAdapter extends LessonModelAdapter {
      planCalls = 0;
      renderCalls = 0;

      async generate(input: GenerateModelInput): Promise<string> {
        if (input.stage === "plan") {
          this.planCalls += 1;
          return JSON.stringify(input.reasoningContext?.lesson_plan);
        }
        this.renderCalls += 1;
        throw new Error("Render model call should be skipped for information_only fast path");
      }
    }

    const adapter = new CountingAdapter();
    const pipeline = new LessonPipeline(adapter, { useDeterministicPlan: false });

    const response = await pipeline.generate({
      topic: "Fractions on a Number Line",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      requested_depth: "standard",
      worksheet_response_format: "auto",
      worksheet_content_mode: "information_only",
      user_constraints: []
    });

    expect(adapter.planCalls).toBe(1);
    expect(adapter.renderCalls).toBe(0);
    expect(response.worksheet.toLowerCase()).toContain("theoretical overview");
    expect(response.quality_metrics.worksheet_contract_valid).toBe(true);
  });
});
