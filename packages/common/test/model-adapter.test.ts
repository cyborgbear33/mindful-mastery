import { describe, expect, it } from "vitest";
import { parseJsonFromModel } from "../src/planning/model-adapter";

describe("parseJsonFromModel", () => {
  it("parses pure JSON object", () => {
    const parsed = parseJsonFromModel('{"ok":true}');
    expect(parsed).toEqual({ ok: true });
  });

  it("parses fenced json payload", () => {
    const parsed = parseJsonFromModel("```json\n{\"ok\":true}\n```");
    expect(parsed).toEqual({ ok: true });
  });

  it("extracts JSON from mixed prose response", () => {
    const parsed = parseJsonFromModel(
      "Here is the plan object:\n{\"ok\":true,\"n\":2}\nLet me know if you need changes."
    );
    expect(parsed).toEqual({ ok: true, n: 2 });
  });
});
