import type { DepthLevel, WorksheetItem } from "../lesson-types";

export type PracticeProblemAngle = {
  id: string;
  code: string;
  label: string;
  description: string;
  applied: boolean;
};

export const PRACTICE_PROBLEM_ANGLES: readonly PracticeProblemAngle[] = [
  {
    id: "definition_recall",
    code: "DR",
    label: "Definition & Recall",
    description: "State definitions, key terms, and core facts from memory.",
    applied: false
  },
  {
    id: "symbol_translation",
    code: "SR",
    label: "Symbol & Representation",
    description: "Move between notation, diagrams, labels, and verbal meaning.",
    applied: false
  },
  {
    id: "distinction_judgment",
    code: "DJ",
    label: "Distinction & Classification",
    description: "Separate near concepts, sort examples, and justify categories.",
    applied: false
  },
  {
    id: "procedural_execution",
    code: "PE",
    label: "Procedural Execution",
    description: "Carry out a standard method step by step with clear work shown.",
    applied: false
  },
  {
    id: "multi_step_solution",
    code: "MS",
    label: "Multi-Step Solution",
    description: "Combine several moves or ideas in one coherent solution path.",
    applied: true
  },
  {
    id: "error_detection",
    code: "EC",
    label: "Error Detection & Correction",
    description: "Find flawed reasoning or work and repair it with justification.",
    applied: false
  },
  {
    id: "compare_contrast",
    code: "CC",
    label: "Compare & Contrast",
    description: "Analyze similarities, differences, and trade-offs between cases.",
    applied: false
  },
  {
    id: "scenario_application",
    code: "SA",
    label: "Scenario Application",
    description: "Use the topic inside a realistic situation with constraints.",
    applied: true
  },
  {
    id: "constraint_reasoning",
    code: "CR",
    label: "Constraint Reasoning",
    description: "Solve under limits, rules, or boundary conditions.",
    applied: true
  },
  {
    id: "reverse_engineering",
    code: "RE",
    label: "Reverse Engineering",
    description: "Infer method, premise, or structure from a given result.",
    applied: true
  },
  {
    id: "estimation_judgment",
    code: "EJ",
    label: "Estimation & Reasonableness",
    description: "Approximate, bound-check, or judge whether an answer fits.",
    applied: false
  },
  {
    id: "pattern_recognition",
    code: "PR",
    label: "Pattern Recognition",
    description: "Identify repeating structure across varied examples.",
    applied: false
  },
  {
    id: "explanation_teaching",
    code: "ET",
    label: "Explanation & Justification",
    description: "Teach the idea to another person and defend each step.",
    applied: false
  },
  {
    id: "transfer_novel",
    code: "TN",
    label: "Transfer to Novel Context",
    description: "Apply the topic where surface features differ from prior examples.",
    applied: true
  }
] as const;

export type PracticePlacementContext = {
  domain?: string;
  subdomain?: string;
  topicFocus?: string;
};

const scopePhrase = (topic: string, context: PracticePlacementContext): string => {
  if (context.topicFocus) {
    return `${context.topicFocus} within ${topic}`;
  }
  if (context.subdomain) {
    return `${topic} in the ${context.subdomain} subdomain`;
  }
  if (context.domain) {
    return `${topic} in the ${context.domain} domain`;
  }
  return topic;
};

const promptForAngle = (
  topic: string,
  angle: PracticeProblemAngle,
  index: number,
  context: PracticePlacementContext
): string => {
  const scope = scopePhrase(topic, context);

  switch (angle.id) {
    case "definition_recall":
      return `Without notes, define the essential terms for ${scope}. Include one sentence on why each term matters.`;
    case "symbol_translation":
      return `Translate one key representation of ${scope} into words, then back into the original form. Item ${index + 1}.`;
    case "distinction_judgment":
      return `Sort three brief cases related to ${scope} into correct vs incorrect use. Explain each judgment.`;
    case "procedural_execution":
      return `Complete a standard procedure for ${scope}. Show each step and label what each step accomplishes.`;
    case "multi_step_solution":
      return `Solve a ${index + 2}-step problem about ${scope}. State the subgoal of each step before you execute it.`;
    case "error_detection":
      return `A flawed solution about ${scope} is shown below (invent a plausible error). Identify the mistake and rewrite the corrected solution.`;
    case "compare_contrast":
      return `Compare two approaches to ${scope}: where do they agree, diverge, and when is each preferable?`;
    case "scenario_application":
      return `Apply ${scope} to a realistic scenario from daily life or work. State givens, method, and conclusion.`;
    case "constraint_reasoning":
      return `Solve a ${scope} problem with an added constraint (time, materials, rules, or limits). Show how the constraint changes your approach.`;
    case "reverse_engineering":
      return `Given a finished outcome involving ${scope}, infer the steps or assumptions that produced it.`;
    case "estimation_judgment":
      return `Estimate or bound-check an answer involving ${scope}. Explain why the estimate is reasonable.`;
    case "pattern_recognition":
      return `Study three mini-examples about ${scope}. State the pattern you notice and use it on a fourth case.`;
    case "explanation_teaching":
      return `Explain ${scope} to a peer who knows the domain but not this topic. Anticipate one likely confusion and address it.`;
    case "transfer_novel":
      return `Apply ${scope} in a setting that looks different from classroom examples. Name what stayed the same structurally.`;
    default:
      return `Practice ${scope} from the angle: ${angle.label}.`;
  }
};

export const getRequiredPracticeAngleCount = (depth: DepthLevel = "standard"): number => {
  switch (depth) {
    case "introductory":
      return 6;
    case "advanced":
      return 10;
    default:
      return 8;
  }
};

export const getScaledPracticeMinimums = (
  depth: DepthLevel = "standard"
): {
  exercises: number;
  applied_scenarios: number;
  observation_tasks: number;
  reflection_prompts: number;
  self_check_items: number;
  min_practice_angles: number;
} => {
  const minAngles = getRequiredPracticeAngleCount(depth);

  switch (depth) {
    case "introductory":
      return {
        exercises: 10,
        applied_scenarios: 3,
        observation_tasks: 3,
        reflection_prompts: 1,
        self_check_items: 4,
        min_practice_angles: minAngles
      };
    case "advanced":
      return {
        exercises: 16,
        applied_scenarios: 5,
        observation_tasks: 5,
        reflection_prompts: 2,
        self_check_items: 6,
        min_practice_angles: minAngles
      };
    default:
      return {
        exercises: 12,
        applied_scenarios: 4,
        observation_tasks: 4,
        reflection_prompts: 1,
        self_check_items: 5,
        min_practice_angles: minAngles
      };
  }
};

export const buildOntologyPracticeItems = (
  topic: string,
  count: number,
  context: PracticePlacementContext,
  preferApplied = false
): WorksheetItem[] => {
  if (count <= 0) return [];

  const pool = preferApplied
    ? PRACTICE_PROBLEM_ANGLES.filter((angle) => angle.applied)
    : PRACTICE_PROBLEM_ANGLES;

  return Array.from({ length: count }, (_, index) => {
    const angle = pool[index % pool.length] ?? PRACTICE_PROBLEM_ANGLES[index % PRACTICE_PROBLEM_ANGLES.length];
    return {
      prompt: promptForAngle(topic, angle, index, context),
      purpose: `${angle.label}: ${angle.description}`,
      practice_angle: angle.id,
      response_format: "open_ended" as const
    };
  });
};

export const listPracticeAngleLabels = (items: WorksheetItem[]): string[] => {
  const labels = new Map<string, string>();
  for (const item of items) {
    if (!item.practice_angle) continue;
    const angle = PRACTICE_PROBLEM_ANGLES.find((entry) => entry.id === item.practice_angle);
    if (angle) labels.set(angle.id, angle.label);
  }
  return [...labels.values()];
};

export const getPracticeAngle = (id?: string): PracticeProblemAngle | undefined =>
  id ? PRACTICE_PROBLEM_ANGLES.find((entry) => entry.id === id) : undefined;

export const getPracticeAngleCode = (id?: string): string => getPracticeAngle(id)?.code ?? "PX";

export const formatPracticeKeyLines = (items: WorksheetItem[]): string[] => {
  const uniqueAngles = new Map<string, PracticeProblemAngle>();
  for (const item of items) {
    const angle = getPracticeAngle(item.practice_angle);
    if (angle) uniqueAngles.set(angle.id, angle);
  }

  return [...uniqueAngles.values()].map((angle) => `- _${angle.code}_ = ${angle.label}`);
};

export const formatPracticeAngleOntologyForPrompt = (): string =>
  PRACTICE_PROBLEM_ANGLES.map(
    (angle, index) =>
      `${index + 1}) ${angle.label} [${angle.code}] (${angle.id}) — ${angle.description}${
        angle.applied ? " [prefer Applied Scenarios section]" : ""
      }`
  ).join("\n");
