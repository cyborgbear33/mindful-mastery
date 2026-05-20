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

const extractBraceCandidate = (raw: string, open: "{" | "[", close: "}" | "]"): string | null => {
  const start = raw.indexOf(open);
  const end = raw.lastIndexOf(close);
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return raw.slice(start, end + 1).trim();
};

export const parseJsonFromModel = (raw: string): unknown => {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [
    fenceMatch ? fenceMatch[1].trim() : null,
    trimmed,
    extractBraceCandidate(trimmed, "{", "}"),
    extractBraceCandidate(trimmed, "[", "]")
  ].filter((value): value is string => Boolean(value));

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`Unable to parse planner JSON: ${lastError.message}`);
  }
  throw new Error("Unable to parse planner JSON.");
};
