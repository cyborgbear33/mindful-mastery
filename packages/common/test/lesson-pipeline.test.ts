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

describe("practice-only generation path", () => {
  it("uses model planning and deterministic rendering for practice_only with non-fake adapters", async () => {
    class CountingAdapter extends LessonModelAdapter {
      planCalls = 0;
      renderCalls = 0;

      async generate(input: GenerateModelInput): Promise<string> {
        if (input.stage === "plan") {
          this.planCalls += 1;
          return JSON.stringify(input.reasoningContext?.lesson_plan);
        }
        if (input.stage === "render") {
          this.renderCalls += 1;
          return "## Guided Exercises\n\n1. Placeholder item";
        }
        return "{}";
      }
    }

    const adapter = new CountingAdapter();
    const pipeline = new LessonPipeline(adapter, { useDeterministicPlan: false });

    const response = await pipeline.generate({
      topic: "Fractions on a Number Line",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      explicit_subdomain: "proportional_reasoning",
      requested_depth: "standard",
      worksheet_response_format: "auto",
      worksheet_content_mode: "practice_only",
      user_constraints: []
    });

    expect(adapter.planCalls).toBeGreaterThan(0);
    expect(adapter.renderCalls).toBe(0);
    expect(response.quality_metrics.worksheet_contract_valid).toBe(true);
    expect(response.reasoning_context.lesson_plan.generation_context.explicit_subdomain).toBe(
      "proportional_reasoning"
    );
  });

  it("keeps deterministic fast path behavior for fake adapter", async () => {
    const { createFakePipeline } = await import("../src/orchestrator/lesson-pipeline");
    const response = await createFakePipeline({ useDeterministicPlan: false }).generate({
      topic: "Fractions on a Number Line",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      requested_depth: "standard",
      worksheet_response_format: "multiple_choice",
      worksheet_content_mode: "practice_only",
      user_constraints: []
    });

    expect(response.quality_metrics.worksheet_contract_valid).toBe(true);
    expect(response.worksheet).toMatch(/\bA\)\s+/);
    expect(response.worksheet).toContain("Response format emphasis: multiple_choice.");
  });

  it("sanitizes malformed latex braces in deterministic practice rendering", async () => {
    class MalformedPlanAdapter extends LessonModelAdapter {
      async generate(input: GenerateModelInput): Promise<string> {
        if (input.stage === "plan") {
          const plan = structuredClone(input.reasoningContext?.lesson_plan);
          if (!plan) throw new Error("Missing plan context");
          plan.lesson_blueprint.worksheet_blueprint.exercises[0].prompt =
            "\\dfrac{2\\frac{1}{3}}{5\\frac{4}{5}}} \\equiv \\dfrac{?}{174}";
          return JSON.stringify(plan);
        }
        throw new Error("Render model call should be skipped for practice_only deterministic rendering");
      }
    }

    const pipeline = new LessonPipeline(new MalformedPlanAdapter(), { useDeterministicPlan: false });
    const response = await pipeline.generate({
      topic: "Proportional Reasoning",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      explicit_subdomain: "proportional_reasoning",
      requested_depth: "standard",
      worksheet_response_format: "auto",
      worksheet_content_mode: "practice_only",
      user_constraints: []
    });

    expect(response.worksheet).not.toContain("\\dfrac{2\\frac{1}{3}}{5\\frac{4}{5}}} \\equiv");
    expect(response.worksheet).not.toContain("}}} \\equiv");
  });

  it("changes practice-only output by requested depth", async () => {
    const { createFakePipeline } = await import("../src/orchestrator/lesson-pipeline");
    const pipeline = createFakePipeline({ useDeterministicPlan: false });

    const introductory = await pipeline.generate({
      topic: "Fractions on a Number Line",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      requested_depth: "introductory",
      worksheet_response_format: "auto",
      worksheet_content_mode: "practice_only",
      user_constraints: []
    });

    const advanced = await pipeline.generate({
      topic: "Fractions on a Number Line",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      requested_depth: "advanced",
      worksheet_response_format: "auto",
      worksheet_content_mode: "practice_only",
      user_constraints: []
    });

    expect(introductory.worksheet).toContain("Depth target: introductory");
    expect(advanced.worksheet).toContain("Depth target: advanced");
    expect(advanced.worksheet).not.toBe(introductory.worksheet);
    expect(advanced.lesson_plan.lesson_blueprint.worksheet_blueprint.exercises.length).toBeGreaterThan(
      introductory.lesson_plan.lesson_blueprint.worksheet_blueprint.exercises.length
    );
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
