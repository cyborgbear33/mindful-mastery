import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeRenderedWorksheet } from "../src/worksheet/normalize-worksheet-markdown";

describe("normalizeRenderedWorksheet", () => {
  it("unwraps markdown code fences and drops LLM preamble", () => {
    const raw = [
      "Here is the final student worksheet (reflection prompt omitted).",
      "",
      "```markdown",
      "# Quadrivium domain scope — Practice",
      "",
      "**Primary domain:** quadrivium",
      "```"
    ].join("\n");

    expect(normalizeRenderedWorksheet(raw)).toBe(
      ["# Quadrivium domain scope — Practice", "", "**Primary domain:** quadrivium"].join("\n")
    );
  });

  it("normalizes a persisted fenced worksheet sample", () => {
    const samplePath = resolve(
      __dirname,
      "../../../.data/lessons/lesson-50058fc3/50058fc3-4621-4c59-8f5a-bd0a454e6422-worksheet.md"
    );
    const raw = readFileSync(samplePath, "utf8");
    const normalized = normalizeRenderedWorksheet(raw);

    expect(normalized).toContain("# Quadrivium domain scope — Practice");
    expect(normalized).not.toContain("```markdown");
    expect(normalized).not.toContain("Here is the final student worksheet");
  });

  it("leaves already-clean markdown unchanged", () => {
    const raw = "# Title — Practice\n\n## Section\n\n1. Item";
    expect(normalizeRenderedWorksheet(raw)).toBe(raw);
  });
});
