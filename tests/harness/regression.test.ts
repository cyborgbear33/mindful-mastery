import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createFakePipeline, validateLessonPlan } from "@mindful-mastery/common/index";

describe("regression harness", () => {
  it("pipeline output matches golden self-attention domain placement", async () => {
    const golden = JSON.parse(
      readFileSync(
        resolve(__dirname, "../../examples/lesson-spec-instances/golden-self-attention.json"),
        "utf8"
      )
    );
    expect(validateLessonPlan(golden).valid).toBe(true);

    const response = await createFakePipeline().generate({
      topic: golden.generation_context.topic,
      requested_output_type: "worksheet",
      explicit_domain: "self",
      current_knowledge_context: golden.student_model.current_knowledge_context,
      requested_depth: "standard",
      worksheet_response_format: "auto",
      worksheet_content_mode: "full",
      user_constraints: []
    });

    expect(response.lesson_plan.constitutional_alignment.primary_domain).toBe("self");
    expect(response.audit_result.constitutional_pass).toBe(true);
  });
});
