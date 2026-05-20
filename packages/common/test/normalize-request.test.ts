import { describe, expect, it } from "vitest";
import {
  buildPlacementContextLines,
  normalizeRequest,
  resolveLessonTopic,
  resolvePlacementScope
} from "../src/normalization/normalize-request";

describe("topic focus and placement scope", () => {
  it("uses topic focus when provided", () => {
    expect(
      resolveLessonTopic({
        topic: "  Fractions on a number line  ",
        explicit_domain: "quadrivium",
        explicit_subdomain: "arithmetic"
      })
    ).toBe("Fractions on a number line");
  });

  it("uses placement scope when topic focus is omitted", () => {
    expect(
      resolvePlacementScope({
        explicit_domain: "quadrivium",
        explicit_subdomain: "set_theory"
      })
    ).toBe("Set Theory within Quadrivium");
  });

  it("describes placement without topic focus in normalized source text", () => {
    const normalized = normalizeRequest({
      requested_output_type: "worksheet",
      explicit_domain: "trivium",
      user_constraints: []
    });

    expect(normalized.topic).toBe("Trivium domain scope");
    expect(normalized.topic_focus).toBeUndefined();
    expect(normalized.source_request_text).toContain("Topic focus: not specified");
    expect(normalized.source_request_text).toContain(
      "plan for the full scope of the selected domain/subdomain"
    );
  });

  it("describes narrowing when topic focus is provided", () => {
    const lines = buildPlacementContextLines({
      explicit_domain: "quadrivium",
      explicit_subdomain: "arithmetic",
      topic_focus: "Fractions on a number line",
      topic: "Fractions on a number line"
    });

    expect(lines.join("\n")).toContain("Topic focus: Fractions on a number line");
    expect(lines.join("\n")).toContain("narrow the lesson to this focus");
  });
});
