import {
  GenerateModelInput,
  LessonModelAdapter,
  ReasoningContext
} from "@mindful-mastery/common/index";

export { GenerateModelInput, LessonModelAdapter };

export class CursorSdkLessonAdapter extends LessonModelAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly defaultModelId: string
  ) {
    super();
  }

  async generate(input: GenerateModelInput): Promise<string> {
    const resolvedModelId = input.modelId?.trim() || this.defaultModelId;

    const { Agent } = await import("@cursor/sdk");
    const result = await Agent.prompt(this.buildPrompt(input), {
      apiKey: this.apiKey,
      model: { id: resolvedModelId },
      local: { cwd: process.cwd(), settingSources: [] }
    });

    if (result.status !== "finished") {
      throw new Error(`Cursor SDK run did not finish: ${result.status}`);
    }

    const content = String(result.result ?? "").trim();
    if (!content) {
      throw new Error("Cursor SDK returned empty content.");
    }

    return content;
  }

  private buildPrompt(input: GenerateModelInput): string {
    const parts = [input.llmPrompt];

    if (input.reasoningContext) {
      parts.push(
        "",
        "Reasoning context:",
        JSON.stringify(input.reasoningContext, null, 2)
      );
    }

    if (input.stage === "plan") {
      parts.push("", "Return ONLY valid JSON. No markdown fences. No commentary.");
    } else if (input.stage === "render") {
      parts.push("", "Return only the final student worksheet in Markdown.");
    }

    return parts.join("\n");
  }
}

export class FakeCursorLessonAdapter extends LessonModelAdapter {
  constructor(private readonly inner: LessonModelAdapter) {
    super();
  }

  async generate(input: GenerateModelInput): Promise<string> {
    return this.inner.generate(input);
  }
}

export type { ReasoningContext };
