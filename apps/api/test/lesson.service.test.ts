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
      user_constraints: []
    });

    expect(response.worksheet).toContain("Guided Exercises");
    expect(response.normalized_request.topic).toBe("Ratio as Structured Comparison");
    expect(response.quality_metrics.schema_valid).toBe(true);
  });
});
