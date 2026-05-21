import { describe, expect, it } from "vitest";
import { FakeLessonModelAdapter } from "@mindful-mastery/common/index";
import { LessonService } from "../src/modules/lesson/lesson.service";

describe("LessonService", () => {
  it("generates worksheet via fake adapter without API key", async () => {
    const service = new LessonService(new FakeLessonModelAdapter());
    const response = await service.generateLesson({
      topic: "Ratio as Structured Comparison",
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      requested_depth: "standard",
      worksheet_response_format: "auto",
      worksheet_content_mode: "full",
      user_constraints: []
    });

    expect(response.worksheet).toContain("Guided Exercises");
    expect(response.normalized_request.topic).toBe("Ratio as Structured Comparison");
    expect(response.quality_metrics.schema_valid).toBe(true);
  });

  it("generates practice-only worksheet via fake adapter without API key", async () => {
    const service = new LessonService(new FakeLessonModelAdapter());
    const response = await service.generateLesson({
      requested_output_type: "worksheet",
      explicit_domain: "quadrivium",
      explicit_subdomain: "arithmetic",
      requested_depth: "standard",
      worksheet_response_format: "auto",
      worksheet_content_mode: "practice_only",
      user_constraints: []
    });

    expect(response.worksheet).toContain("— Practice");
    expect(response.worksheet.toLowerCase()).toContain("applied scenarios");
    expect(response.quality_metrics.worksheet_contract_valid).toBe(true);
  });
});
