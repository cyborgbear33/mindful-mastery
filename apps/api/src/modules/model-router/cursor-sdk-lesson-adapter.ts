import {
  GenerateModelInput,
  LessonModelAdapter,
  ReasoningContext
} from "@mindful-mastery/common/index";

export { GenerateModelInput, LessonModelAdapter };

const formatAdapterError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export class CursorSdkLessonAdapter extends LessonModelAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly defaultModelId: string
  ) {
    super();
  }

  async generate(input: GenerateModelInput): Promise<string> {
    const resolvedModelId = input.modelId?.trim() || this.defaultModelId;

    try {
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
    } catch (error) {
      throw new Error(`Cursor SDK generation failed: ${formatAdapterError(error)}`);
    }
  }

  private buildPrompt(input: GenerateModelInput): string {
    const parts = [input.llmPrompt];

    if (input.reasoningContext) {
      parts.push(
        "",
        "Reasoning context:",
        JSON.stringify(this.serializeReasoningContext(input.reasoningContext, input.stage), null, 2)
      );
    }

    if (input.stage === "plan") {
      parts.push("", "Return ONLY valid JSON. No markdown fences. No commentary.");
    } else if (input.stage === "render") {
      parts.push("", "Return only the final student worksheet in Markdown.");
    }

    return parts.join("\n");
  }

  private serializeReasoningContext(
    reasoningContext: ReasoningContext,
    stage?: GenerateModelInput["stage"]
  ): ReasoningContext {
    if (stage !== "render") {
      return reasoningContext;
    }

    const blueprint = reasoningContext.lesson_plan.lesson_blueprint.worksheet_blueprint;
    return {
      ...reasoningContext,
      lesson_plan: {
        ...reasoningContext.lesson_plan,
        lesson_blueprint: {
          ...reasoningContext.lesson_plan.lesson_blueprint,
          worksheet_blueprint: {
            ...blueprint,
            exercises: blueprint.exercises.map((item) => ({
              prompt: item.prompt,
              purpose: item.purpose,
              practice_angle: item.practice_angle,
              response_format: item.response_format
            })),
            applied_scenarios: blueprint.applied_scenarios?.map((item) => ({
              prompt: item.prompt,
              purpose: item.purpose,
              practice_angle: item.practice_angle,
              response_format: item.response_format
            })),
            observation_tasks: blueprint.observation_tasks.map((item) => ({
              prompt: item.prompt,
              purpose: item.purpose,
              practice_angle: item.practice_angle,
              response_format: item.response_format
            })),
            self_check_items: blueprint.self_check_items.map((item) => ({
              prompt: item.prompt,
              purpose: item.purpose,
              practice_angle: item.practice_angle,
              response_format: item.response_format
            }))
          }
        }
      }
    };
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
