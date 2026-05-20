import { describe, expect, it } from "vitest";
import {
  formatWorksheetHeaderDate,
  hasWorksheetHeader,
  renderWorksheetHeader
} from "../src/worksheet/render-worksheet-header";

describe("renderWorksheetHeader", () => {
  it("returns empty string when no header fields are provided", () => {
    expect(renderWorksheetHeader({})).toBe("");
    expect(hasWorksheetHeader({})).toBe(false);
  });

  it("renders only populated header lines", () => {
    const header = renderWorksheetHeader({
      name: "Room 12",
      description: "Fractions review"
    });

    expect(header).toContain("**Name:** Room 12");
    expect(header).toContain("**Notes:** Fractions review");
    expect(header).not.toContain("**Date:**");
    expect(header).toContain("---");
  });

  it("formats ISO dates for print-friendly display", () => {
    expect(formatWorksheetHeaderDate("2026-05-20")).toBe("May 20, 2026");
  });
});
