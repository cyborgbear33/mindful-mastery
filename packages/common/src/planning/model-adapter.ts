import { ReasoningContext } from "../lesson-types";

export type ModelStage = "plan" | "render" | "audit";

export type GenerateModelInput = {
  llmPrompt: string;
  reasoningContext?: ReasoningContext;
  modelId?: string;
  stage: ModelStage;
};

export abstract class LessonModelAdapter {
  abstract generate(input: GenerateModelInput): Promise<string>;
}

export const parseJsonFromModel = (raw: string): unknown => {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(candidate);
};
