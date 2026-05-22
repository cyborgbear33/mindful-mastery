import {
  DepthLevel,
  LearnerModel,
  LessonPlanObject,
  NormalizedRequest,
  WorksheetResponseFormat,
  WorksheetContentMode,
  WorksheetItem
} from "../lesson-types";
import {
  buildOntologyPracticeItems,
  formatPracticeKeyLines,
  getPracticeAngleCode
} from "../worksheet/practice-problem-ontology";
import {
  renderPracticeTitleBlock,
  renderWorksheetTitleBlock
} from "../worksheet/render-worksheet-title-block";
import { getWorksheetModeDefinition, resolvePracticeMinimums } from "../worksheet/worksheet-content-modes";
import { renderWorksheetHeader } from "../worksheet/render-worksheet-header";
import { GenerateModelInput, LessonModelAdapter } from "./model-adapter";

const formatItems = (items: { prompt: string; purpose: string }[]) =>
  items.map((item, i) => `${i + 1}. ${item.prompt}\n   _Purpose: ${item.purpose}_`).join("\n\n");

const resolveItemResponseFormat = (
  requested: WorksheetResponseFormat,
  index: number
): WorksheetResponseFormat => {
  if (requested === "mixed") {
    const cycle: WorksheetResponseFormat[] = [
      "open_ended",
      "multiple_choice",
      "true_false",
      "fill_in"
    ];
    return cycle[index % cycle.length] ?? "open_ended";
  }
  if (requested === "quiz") return "multiple_choice";
  if (requested === "test") return index % 3 === 0 ? "multiple_choice" : "open_ended";
  return requested;
};

const evaluateArithmeticExpressionFromPrompt = (prompt: string): number | null => {
  const expressionMatch = prompt.match(/([0-9()\s+\-×÷*/.]+)=\s*_{2,}/);
  const expression = expressionMatch?.[1]?.trim();
  if (!expression) return null;

  const sanitized = expression.replace(/×/g, "*").replace(/÷/g, "/");
  if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) return null;

  try {
    const value = Function(`"use strict"; return (${sanitized});`)();
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

const buildMultipleChoiceOptions = (prompt: string, itemIndex: number): string[] => {
  const computed = evaluateArithmeticExpressionFromPrompt(prompt);
  if (computed === null) {
    return ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"];
  }

  const rounded = Number.isInteger(computed) ? computed : Number(computed.toFixed(2));
  const distractorA = rounded + 1 + (itemIndex % 2);
  const distractorB = rounded - (1 + ((itemIndex + 1) % 2));
  const distractorC = rounded + 2;
  return [`A) ${rounded}`, `B) ${distractorA}`, `C) ${distractorB}`, `D) ${distractorC}`];
};

const removeUnmatchedClosingBraces = (input: string): string => {
  let openCount = 0;
  let output = "";

  for (const char of input) {
    if (char === "{") {
      openCount += 1;
      output += char;
      continue;
    }
    if (char === "}") {
      if (openCount > 0) {
        openCount -= 1;
        output += char;
      }
      continue;
    }
    output += char;
  }

  return output;
};

const cleanPracticePrompt = (prompt: string): string =>
  removeUnmatchedClosingBraces(prompt)
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const renderPromptByResponseFormat = (
  prompt: string,
  requestedFormat: WorksheetResponseFormat,
  itemIndex: number
): string => {
  const format = resolveItemResponseFormat(requestedFormat, itemIndex);
  switch (format) {
    case "multiple_choice":
      return [prompt, ...buildMultipleChoiceOptions(prompt, itemIndex)].join("\n   ");
    case "true_false":
      return `True or False: ${prompt}`;
    case "fill_in":
      return `${prompt}\n   Answer: ________`;
    default:
      return prompt;
  }
};

type RenderedPracticeSection =
  | "guided"
  | "applied"
  | "workbook"
  | "observation"
  | "self_check";

const formatPracticeItems = (
  items: WorksheetItem[],
  requestedFormat: WorksheetResponseFormat,
  section: RenderedPracticeSection
) =>
  items
    .map((item, i) => {
      const cleanedPrompt = cleanPracticePrompt(item.prompt);
      const formattedPrompt = renderPromptByResponseFormat(cleanedPrompt, requestedFormat, i);
      const label =
        section === "applied"
          ? "Scenario"
          : section === "observation"
            ? "Task"
            : section === "self_check"
              ? "Check"
              : "Problem";
      return `${i + 1}. _${getPracticeAngleCode(item.practice_angle)}_ **${label}:** ${formattedPrompt}`;
    })
    .join("\n\n");

type PracticeSubjectProfile =
  | "math"
  | "language"
  | "science"
  | "engineering"
  | "self"
  | "integration"
  | "general";

type ConcretePracticeKind = "guided" | "applied" | "observation" | "self_check" | "workbook";

const resolvePracticeSubjectProfileFromScope = (
  topic: string,
  domain?: string,
  subdomain?: string
): PracticeSubjectProfile => {
  const scope = `${topic} ${domain ?? ""} ${subdomain ?? ""}`.toLowerCase();

  if (["quadrivium", "arithmetic", "algebra", "geometry", "fraction", "number", "math"].some((token) => scope.includes(token))) {
    return "math";
  }
  if (["trivium", "grammar", "logic", "rhetoric", "writing", "reading", "language"].some((token) => scope.includes(token))) {
    return "language";
  }
  if (["science_analysis", "science", "analysis", "experiment", "biology", "chemistry", "physics"].some((token) => scope.includes(token))) {
    return "science";
  }
  if (["engineering", "craft", "architecture", "design", "build"].some((token) => scope.includes(token))) {
    return "engineering";
  }
  if (["self", "habit", "attention", "emotion", "discipline"].some((token) => scope.includes(token))) {
    return "self";
  }
  if (["integration", "systems", "whole"].some((token) => scope.includes(token))) {
    return "integration";
  }
  return "general";
};

const resolvePracticeSubjectProfile = (request: NormalizedRequest): PracticeSubjectProfile =>
  resolvePracticeSubjectProfileFromScope(
    request.topic,
    request.explicit_domain,
    request.explicit_subdomain
  );

const mathComputationPrompt = (index: number, depth: DepthLevel): string => {
  const a = 2 + ((index * 3) % 9);
  const b = 2 + ((index * 5) % 9);
  const c = 2 + ((index * 7) % 6);

  if (depth === "introductory") {
    return index % 2 === 0 ? `${a} + ${b} = ____` : `${a + b} - ${a} = ____`;
  }
  if (depth === "advanced") {
    if (index % 3 === 0) return `(${a} + ${b}) × ${c} = ____`;
    if (index % 3 === 1) return `${a * b} ÷ ${a} + ${c} = ____`;
    return `x + ${a} = ${a + b}. x = ____`;
  }

  if (index % 4 === 0) return `${a} + ${b} = ____`;
  if (index % 4 === 1) return `${a + b + 3} - ${b} = ____`;
  if (index % 4 === 2) return `${a} × ${c} = ____`;
  return `${a * c} ÷ ${c} = ____`;
};

const buildConcretePracticePrompt = (
  profile: PracticeSubjectProfile,
  kind: ConcretePracticeKind,
  topic: string,
  depth: DepthLevel,
  index: number
): string => {
  if (profile === "math") {
    const first = 6 + ((index * 3) % 8);
    const second = 4 + ((index * 2) % 7);
    const total = first + second;

    if (kind === "workbook") return mathComputationPrompt(index, depth);
    if (kind === "guided") {
      const prompts = [
        `Word problem: A class has ${first} red pencils and ${second} blue pencils. How many pencils are there in all? Show a number sentence and write the final answer: ________`,
        `Word problem: Mia had ${total} marbles and gave ${second} to a friend. How many marbles does she have left? Show your subtraction equation: ________`,
        `Two-step problem: One box has ${first} stickers and another has ${second}. They are shared equally between 2 students. How many stickers does each student get? ________`,
        `Word problem: A bus has ${first} students. ${second} more students get on at the next stop. How many students are on the bus now? ________`
      ];
      return prompts[index % prompts.length] ?? prompts[0];
    }
    if (kind === "applied") {
      const prompts = [
        `Store scenario: A juice costs $${first}. You pay with $${total}. How much change should you get? ________`,
        `Recipe scenario: A recipe uses ${first} cups of flour and ${second} cups of sugar. How many cups are used altogether? ________`,
        `Game scenario: Team A scored ${first} points and Team B scored ${second}. What is the point difference? ________`,
        `Travel scenario: You walk ${first} blocks in the morning and ${second} in the afternoon. How many blocks total? ________`
      ];
      return prompts[index % prompts.length] ?? prompts[0];
    }
    if (kind === "observation") {
      return `Find 3 numbers around you (price tags, scores, or times). Order them least to greatest: ________`;
    }
    return index % 2 === 0
      ? `Can you solve two problems in a row without help? Yes / Not yet`
      : `Circle the operation you used most today: +  -  ×  ÷`;
  }

  if (profile === "language") {
    if (kind === "workbook") {
      const drills = [
        "Underline the noun in this sentence: The dog runs fast.",
        "Choose the correct word: Their / There / They're going to school.",
        "Add punctuation: where are you going",
        "Write the plural form of: child = ________"
      ];
      return drills[index % drills.length] ?? drills[0];
    }
    if (kind === "guided") {
      const prompts = [
        "Read this sentence and fix all grammar errors: my sister and me was late for school.",
        "Write a 3-sentence paragraph about recess. Use one adjective and one transition word.",
        "Rewrite this sentence to make the meaning clearer: He told him that he was wrong."
      ];
      return prompts[index % prompts.length] ?? prompts[0];
    }
    if (kind === "applied") {
      const prompts = [
        `Write one clear sentence about ${topic} with a subject and a verb.`,
        `Create a short announcement about ${topic} for your class using complete sentences.`,
        `Write a two-line dialogue where one speaker explains ${topic} clearly.`
      ];
      return prompts[index % prompts.length] ?? prompts[0];
    }
    if (kind === "observation") return "Find one sentence in a book and label noun, verb, and adjective.";
    return "Check: Did your sentence start with a capital letter and end with punctuation? Yes / No";
  }

  if (profile === "science") {
    if (kind === "workbook") {
      const drills = [
        "Label this as solid, liquid, or gas: ice, water, steam.",
        "Circle the living things: rock, tree, bird, pencil.",
        "Write one observation and one inference about a plant."
      ];
      return drills[index % drills.length] ?? drills[0];
    }
    if (kind === "guided") {
      const prompts = [
        "Mini-lab: Put ice in a cup and check it after 10 minutes. Record one observation and one explanation.",
        "Investigation: Shine a flashlight on 3 objects. Which are transparent, translucent, or opaque? Fill in a table.",
        "Data problem: A plant grew 2 cm, 3 cm, and 4 cm in three weeks. What is the total growth and weekly average?"
      ];
      return prompts[index % prompts.length] ?? prompts[0];
    }
    if (kind === "applied") {
      const prompts = [
        `Record one simple test about ${topic}: question, prediction, result.`,
        `Real-life scenario: Explain how ${topic} appears in your kitchen or classroom.`,
        `Safety scenario: List one safe way to explore ${topic} with household materials.`
      ];
      return prompts[index % prompts.length] ?? prompts[0];
    }
    if (kind === "observation") return "Observe something for 2 minutes and list 3 facts you can directly see.";
    return "Check: Did you separate observations from guesses? Yes / No";
  }

  if (profile === "engineering") {
    if (kind === "workbook") return "Draw and label a simple design with size, material, and purpose.";
    if (kind === "guided") {
      return "Design challenge: sketch two possible solutions, compare trade-offs, and choose one with a reason.";
    }
    if (kind === "applied") {
      const prompts = [
        "Build a paper prototype and list one change that improved it.",
        "Identify a classroom problem and propose a design that solves it within one material limit.",
        "Test your design for 2 minutes and record one failure point and one improvement."
      ];
      return prompts[index % prompts.length] ?? prompts[0];
    }
    if (kind === "observation") return "Find one object and explain why its shape helps it work.";
    return "Check: Did your design meet the stated constraint? Yes / No";
  }

  if (profile === "self") {
    if (kind === "workbook") return "Complete the sentence: One habit that helps me learn is ________.";
    if (kind === "guided") {
      return "Scenario: You feel distracted during homework. Write a 3-step plan to return focus in under 2 minutes.";
    }
    if (kind === "applied") {
      const prompts = [
        `Use one strategy from ${topic} today and write what happened in 2 lines.`,
        `Pick a difficult moment today and describe how you used ${topic} to respond better.`,
        `Set one measurable goal tied to ${topic} for tomorrow and write your success check.`
      ];
      return prompts[index % prompts.length] ?? prompts[0];
    }
    if (kind === "observation") return "Track focus for 10 minutes. Mark each minute on-task or distracted.";
    return "Check: Did you return to focus after distraction? Yes / Not yet";
  }

  if (profile === "integration") {
    if (kind === "workbook") return `Match each idea in ${topic} to one real-life example.`;
    if (kind === "guided") {
      return `Case study: Given a short scenario, explain how ${topic} connects at least two domains with evidence.`;
    }
    if (kind === "applied") {
      const prompts = [
        "Connect this topic to math, language, and science in one short chart.",
        "Choose one real problem and map which domains contribute to solving it.",
        `Explain how ${topic} changes if you view it from a different domain lens.`
      ];
      return prompts[index % prompts.length] ?? prompts[0];
    }
    if (kind === "observation") return "Observe one situation and name two domains that interact in it.";
    return "Check: Can you explain the connection in one sentence? Yes / No";
  }

  if (kind === "workbook") return `Solve: ${topic} quick drill ${index + 1}.`;
  if (kind === "guided") return `Multi-step problem: solve ${topic} case ${index + 1} and show your reasoning.`;
  if (kind === "applied") return `Apply ${topic} to a real-life scenario and justify your approach.`;
  if (kind === "observation") return `Observe one real example connected to ${topic}.`;
  return `Self-check: What can you now do with ${topic}?`;
};

const buildWorkbookProblems = (
  topic: string,
  count: number,
  domain: string,
  depth: DepthLevel,
  subdomain?: string
): WorksheetItem[] => {
  const profile = resolvePracticeSubjectProfileFromScope(topic, domain, subdomain);

  return Array.from({ length: count }, (_, index) => ({
    prompt: buildConcretePracticePrompt(profile, "workbook", topic, depth, index),
    purpose: "Workbook-style pencil-and-paper practice",
    practice_angle: "procedural_execution",
    response_format: "open_ended"
  }));
};

const buildPracticeItems = (
  topic: string,
  kind: "exercise" | "observation" | "reflection" | "self_check",
  count: number
): WorksheetItem[] => {
  const templates: Record<typeof kind, (index: number) => WorksheetItem> = {
    exercise: (index) => ({
      prompt:
        index === 0
          ? `Explain ${topic} in your own words.`
          : index === 1
            ? `Apply ${topic} to a concrete example from your experience.`
            : index === 2
              ? `Compare two situations where ${topic} applies and one where it does not.`
              : index === 3
                ? `Identify a common mistake about ${topic} and correct it.`
                : index === 4
                  ? `Solve a short scenario that requires ${topic}. Show your reasoning.`
                  : `Create a new practice question about ${topic} and answer it.`,
      purpose:
        index === 0
          ? "Verify conceptual grasp"
          : index === 1
            ? "Embody understanding through use"
            : index === 2
              ? "Strengthen distinction and judgment"
              : index === 3
                ? "Correct likely confusions"
                : index === 4
                  ? "Apply in a structured scenario"
                  : "Extend and self-test understanding",
      response_format: "open_ended"
    }),
    observation: (index) => ({
      prompt:
        index === 0
          ? `Observe one real instance of ${topic} in the next 24 hours. Record what you notice.`
          : `Find an example of ${topic} in a book, video, or conversation. Summarize the example.`,
      purpose: index === 0 ? "Ground theory in reality" : "Connect learning to lived context",
      response_format: "open_ended"
    }),
    reflection: (index) => ({
      prompt:
        index === 0
          ? `Why does ${topic} matter for your learning?`
          : `What is still unclear to you about ${topic}?`,
      purpose:
        index === 0 ? "Connect to why-it-matters framing" : "Surface remaining gaps honestly",
      response_format: "open_ended"
    }),
    self_check: (index) => ({
      prompt:
        index === 0
          ? `Can you define the key terms related to ${topic}?`
          : index === 1
            ? `Can you give one real-world example of ${topic} without looking at your notes?`
            : `Can you teach ${topic} to someone else in two sentences?`,
      purpose:
        index === 0
          ? "Verify definition mastery"
          : index === 1
            ? "Check recall and transfer"
            : "Confirm teach-back capability",
      response_format: "open_ended"
    })
  };

  return Array.from({ length: count }, (_, index) => templates[kind](index));
};

const buildPracticeOnlyBlueprint = (
  request: NormalizedRequest
): LessonPlanObject["lesson_blueprint"]["worksheet_blueprint"] => {
  const minimums = resolvePracticeMinimums("practice_only", request.requested_depth);
  const profile = resolvePracticeSubjectProfile(request);
  const placement = {
    domain: request.explicit_domain,
    subdomain: request.explicit_subdomain,
    topicFocus: request.topic_focus
  };

  const exercises = buildOntologyPracticeItems(
    request.topic,
    minimums.exercises,
    placement,
    false
  ).map((item, index) => ({
    ...item,
    prompt: buildConcretePracticePrompt(profile, "guided", request.topic, request.requested_depth, index)
  }));
  const appliedScenarios = buildOntologyPracticeItems(
    request.topic,
    minimums.applied_scenarios,
    placement,
    true
  ).map((item, index) => ({
    ...item,
    prompt: buildConcretePracticePrompt(profile, "applied", request.topic, request.requested_depth, index)
  }));
  const observationTasks = buildOntologyPracticeItems(
    request.topic,
    minimums.observation_tasks,
    placement,
    true
  ).map((item, index) => ({
    ...item,
    prompt: buildConcretePracticePrompt(
      profile,
      "observation",
      request.topic,
      request.requested_depth,
      index
    )
  }));
  const selfCheckItems = buildOntologyPracticeItems(
    request.topic,
    minimums.self_check_items,
    placement,
    false
  ).map((item, index) => ({
    ...item,
    prompt: buildConcretePracticePrompt(
      profile,
      "self_check",
      request.topic,
      request.requested_depth,
      index
    )
  }));
  const reflectionCount = Math.max(minimums.reflection_prompts, 1);

  return {
    exercises,
    applied_scenarios: appliedScenarios,
    observation_tasks: observationTasks,
    reflection_prompts: buildPracticeItems(request.topic, "reflection", reflectionCount),
    self_check_items: selfCheckItems,
    capability_checkpoint: `Demonstrate mastery of ${request.topic} by completing guided exercises and applied scenarios across at least ${minimums.min_practice_angles} distinct problem types without copying earlier answers.`
  };
};

const headerFromLessonPlan = (lessonPlan: LessonPlanObject): string =>
  renderWorksheetHeader({
    name: lessonPlan.generation_context.worksheet_header_name,
    date: lessonPlan.generation_context.worksheet_header_date,
    description: lessonPlan.generation_context.worksheet_header_description
  });

const titleBlockFromPlan = (
  lessonPlan: LessonPlanObject,
  suffix: "Worksheet" | "Information"
): string[] =>
  renderWorksheetTitleBlock({
    title: lessonPlan.topic_model.title,
    domain: lessonPlan.constitutional_alignment.primary_domain,
    adjacentDomains: lessonPlan.constitutional_alignment.adjacent_domains,
    suffix
  });

const practiceTitleFromPlan = (lessonPlan: LessonPlanObject): string[] =>
  renderPracticeTitleBlock({
    title: lessonPlan.topic_model.title,
    domain: lessonPlan.constitutional_alignment.primary_domain,
    adjacentDomains: lessonPlan.constitutional_alignment.adjacent_domains
  });

const renderFullWorksheet = (
  lessonPlan: LessonPlanObject,
  learnerModel: LearnerModel
): string => {
  const wb = lessonPlan.lesson_blueprint.worksheet_blueprint;
  const bp = lessonPlan.lesson_blueprint;

  return [
    ...titleBlockFromPlan(lessonPlan, "Worksheet"),
    "",
    "## Learner Orientation",
    `**Current knowledge context:** ${learnerModel.current_knowledge_context}`,
    `**Target knowledge context:** ${learnerModel.target_knowledge_context}`,
    `**Transformation:** ${learnerModel.transformation_goal}`,
    bp.orientation.content,
    "",
    "## Core Definitions and Distinctions",
    ...lessonPlan.topic_model.definitions.map((d) => `- **${d.term}:** ${d.definition}`),
    "",
    "**Distinctions:**",
    ...lessonPlan.topic_model.distinctions.map(
      (d) => `- ${d.term_a} vs ${d.term_b}: ${d.distinction}`
    ),
    "",
    "## Theoretical Overview",
    bp.theoretical_overview.content,
    "",
    "## Real-World Examples",
    bp.real_manifestation.content,
    "",
    "## Guided Exercises",
    formatItems(wb.exercises),
    "",
    "## Observation / Application Tasks",
    formatItems(wb.observation_tasks),
    "",
    "## Reflection Prompts",
    formatItems(wb.reflection_prompts),
    "",
    "## Self-Check",
    formatItems(wb.self_check_items),
    "",
    "## Capability Checkpoint",
    wb.capability_checkpoint
  ].join("\n");
};

const renderPracticeOnlyWorksheet = (
  lessonPlan: LessonPlanObject,
  learnerModel: LearnerModel
): string => {
  const wb = lessonPlan.lesson_blueprint.worksheet_blueprint;
  const requestedFormat = lessonPlan.generation_context.worksheet_response_format ?? "auto";
  const requestedDepth = lessonPlan.generation_context.requested_depth;
  const practiceItems = [
    ...wb.exercises,
    ...(wb.applied_scenarios ?? []),
    ...wb.observation_tasks,
    ...wb.self_check_items
  ];
  const workbookProblems = buildWorkbookProblems(
    lessonPlan.topic_model.title,
    Math.min(
      wb.exercises.length + 2,
      Math.max(10, Math.min(14, Math.floor(wb.exercises.length / 2) + 6))
    ),
    lessonPlan.constitutional_alignment.primary_domain,
    requestedDepth,
    lessonPlan.constitutional_alignment.primary_subdomain
  );
  const keyLines = formatPracticeKeyLines(practiceItems);
  const depthLine =
    requestedDepth === "introductory"
      ? "Depth target: introductory (foundational steps and clear method)."
      : requestedDepth === "advanced"
        ? "Depth target: advanced (formal justification and transfer challenges)."
        : "Depth target: standard (balanced conceptual and applied practice).";

  return [
    ...practiceTitleFromPlan(lessonPlan),
    "",
    "## Brief Learner Orientation",
    `You are moving from: ${learnerModel.current_knowledge_context}`,
    `You are working toward: ${learnerModel.target_knowledge_context}`,
    `This sheet emphasizes many problem types and solution angles for ${lessonPlan.topic_model.title}.`,
    depthLine,
    `Response format emphasis: ${requestedFormat}.`,
    "",
    "## Guided Exercises",
    formatPracticeItems(wb.exercises, requestedFormat, "guided"),
    "",
    "## Applied Scenarios",
    formatPracticeItems(wb.applied_scenarios ?? [], requestedFormat, "applied"),
    "",
    "## Pencil-and-Paper Workbook Problems",
    formatPracticeItems(workbookProblems, requestedFormat, "workbook"),
    "",
    "## Observation / Application Tasks",
    formatPracticeItems(wb.observation_tasks, requestedFormat, "observation"),
    "",
    "## Self-Check",
    formatPracticeItems(wb.self_check_items, requestedFormat, "self_check"),
    "",
    "## Capability Checkpoint",
    wb.capability_checkpoint,
    "",
    "## Problem Type Key",
    ...keyLines
  ].join("\n");
};

const renderInformationOnlyWorksheet = (
  lessonPlan: LessonPlanObject,
  learnerModel: LearnerModel
): string => {
  const bp = lessonPlan.lesson_blueprint;

  return [
    ...titleBlockFromPlan(lessonPlan, "Information"),
    "",
    "## Learner Orientation",
    `**Current knowledge context:** ${learnerModel.current_knowledge_context}`,
    `**Target knowledge context:** ${learnerModel.target_knowledge_context}`,
    `**Transformation:** ${learnerModel.transformation_goal}`,
    bp.orientation.content,
    "",
    "## Core Definitions and Distinctions",
    ...lessonPlan.topic_model.definitions.map((d) => `- **${d.term}:** ${d.definition}`),
    "",
    "**Distinctions:**",
    ...lessonPlan.topic_model.distinctions.map(
      (d) => `- ${d.term_a} vs ${d.term_b}: ${d.distinction}`
    ),
    "",
    "## Theoretical Overview",
    bp.theoretical_overview.content,
    "",
    "## Real-World Examples",
    bp.real_manifestation.content,
    "",
    "## Integration",
    bp.integration.content,
    "",
    "## Capability Statement",
    bp.capability_statement.content
  ].join("\n");
};

export const renderWorksheetFromPlan = (
  lessonPlan: LessonPlanObject,
  learnerModel: LearnerModel,
  contentMode: WorksheetContentMode = "full"
): string => {
  const header = headerFromLessonPlan(lessonPlan);
  let body: string;

  switch (contentMode) {
    case "practice_only":
      body = renderPracticeOnlyWorksheet(lessonPlan, learnerModel);
      break;
    case "information_only":
      body = renderInformationOnlyWorksheet(lessonPlan, learnerModel);
      break;
    default:
      body = renderFullWorksheet(lessonPlan, learnerModel);
  }

  return `${header}${body}`;
};

export const buildPlannerStubPlan = (
  request: NormalizedRequest,
  learnerModel: LearnerModel
): LessonPlanObject => {
  const plan = buildDeterministicLessonPlan(request, learnerModel);
  const placeholder: WorksheetItem = {
    prompt: "Planner will populate concrete items.",
    purpose: "Stub item for planner context only.",
    response_format: "open_ended"
  };

  plan.lesson_blueprint.worksheet_blueprint = {
    exercises: [placeholder],
    observation_tasks: [placeholder],
    reflection_prompts: [placeholder],
    self_check_items: [placeholder],
    capability_checkpoint: plan.lesson_blueprint.worksheet_blueprint.capability_checkpoint
  };
  plan.quality_controls.inference_assumptions = [
    "Minimal planner stub — full worksheet_blueprint is produced by the planner model."
  ];

  return plan;
};

export const buildDeterministicLessonPlan = (
  request: NormalizedRequest,
  learnerModel: LearnerModel
): LessonPlanObject => {
  const lessonId = `lesson-${request.request_id.slice(0, 8)}`;
  const domain = request.explicit_domain ?? "self";
  const modeDefinition = getWorksheetModeDefinition(request.worksheet_content_mode);
  const minimums = resolvePracticeMinimums(
    request.worksheet_content_mode,
    request.requested_depth
  );
  const exerciseCount = Math.max(minimums.exercises, 1);
  const observationCount = modeDefinition.omit_practice_sections
    ? 1
    : Math.max(minimums.observation_tasks, 1);
  const reflectionCount = Math.max(minimums.reflection_prompts, 1);
  const selfCheckCount = modeDefinition.omit_practice_sections
    ? 1
    : Math.max(minimums.self_check_items, 1);
  const worksheetBlueprint =
    request.worksheet_content_mode === "practice_only"
      ? buildPracticeOnlyBlueprint(request)
      : {
          exercises: buildPracticeItems(request.topic, "exercise", exerciseCount),
          observation_tasks: buildPracticeItems(request.topic, "observation", observationCount),
          reflection_prompts: buildPracticeItems(request.topic, "reflection", reflectionCount),
          self_check_items: buildPracticeItems(request.topic, "self_check", selfCheckCount),
          capability_checkpoint: `Demonstrate understanding of ${request.topic} by completing all exercises and explaining one real-world connection.`
        };

  return {
    spec_metadata: {
      spec_version: "1.2.0",
      lesson_id: lessonId,
      created_at: new Date().toISOString(),
      output_type: request.requested_output_type,
      parent_request_id: request.request_id
    },
    constitutional_alignment: {
      primary_domain: domain,
      primary_subdomain: request.explicit_subdomain,
      adjacent_domains: domain === "self" ? ["trivium"] : ["self"],
      transformation_goal: learnerModel.transformation_goal,
      topic_id: request.topic_id,
      topic_source: request.topic_source ?? "free_text",
      four_layer_integrity: {
        principle_present: true,
        form_present: true,
        manifestation_present: true,
        embodiment_present: true
      }
    },
    generation_context: {
      request_id: request.request_id,
      topic: request.topic,
      requested_output_type: request.requested_output_type,
      requested_depth: request.requested_depth,
      source_request_text: request.source_request_text,
      explicit_audience: request.explicit_audience,
      worksheet_header_name: request.worksheet_header_name,
      worksheet_header_date: request.worksheet_header_date,
      worksheet_header_description: request.worksheet_header_description,
      explicit_domain: request.explicit_domain,
      explicit_subdomain: request.explicit_subdomain,
      topic_id: request.topic_id,
      topic_source: request.topic_source,
      topic_focus: request.topic_focus,
      worksheet_response_format: request.worksheet_response_format,
      worksheet_content_mode: request.worksheet_content_mode,
      user_constraints: request.user_constraints
    },
    student_model: learnerModel,
    topic_model: {
      title: request.topic,
      why_it_matters: `Understanding ${request.topic} strengthens ordered learning and capability in the ${domain} domain.`,
      definitions: [
        {
          term: request.topic.split(" ").slice(0, 3).join(" "),
          definition: `The central subject of this lesson: ${request.topic}.`
        }
      ],
      distinctions: [
        {
          term_a: "Understanding",
          term_b: "Information",
          distinction: "Understanding is ordered formation; information is raw content without integration."
        }
      ],
      subdomain: request.explicit_subdomain,
      placement_notes: request.topic_focus
        ? `Topic focus "${request.topic_focus}" narrows content within ${
            request.explicit_subdomain ?? request.explicit_domain ?? domain
          }.`
        : request.explicit_subdomain
          ? `Lesson follows the full scope of subdomain ${request.explicit_subdomain} without a further topic focus.`
          : `Lesson follows the full scope of the ${domain} domain without a further topic focus.`
    },
    lesson_blueprint: {
      orientation: {
        title: "Orientation",
        content: `This lesson on ${request.topic} belongs primarily to the ${domain} domain.`
      },
      knowledge_context_framing: {
        title: "Knowledge Context Framing",
        content: `From: ${learnerModel.current_knowledge_context} Toward: ${learnerModel.target_knowledge_context}`
      },
      core_definitions_and_distinctions: {
        title: "Core Definitions and Distinctions",
        content: `Define ${request.topic} and distinguish it from nearby confusions.`
      },
      theoretical_overview: {
        title: "Theoretical Overview",
        content: `${request.topic} is governed by principles that connect theory to practice because learning requires ordered understanding.`
      },
      abstract_or_formal_structure: {
        title: "Abstract / Formal Structure",
        content: `Model ${request.topic} with a clear structural form and logical model.`
      },
      real_manifestation: {
        title: "Real-World Manifestation",
        content: `Observe how ${request.topic} appears in real daily life and practical conditions.`
      },
      application_and_embodiment: {
        title: "Application and Embodiment",
        content: `Apply ${request.topic} through exercises and observation. Common errors include conflating familiarity with understanding.`
      },
      integration: {
        title: "Integration",
        content: `Connect ${request.topic} to the larger architecture of learning and the greater whole across domains.`
      },
      capability_statement: {
        title: "Capability Gained",
        content: `The learner can explain, apply, and integrate ${request.topic} and is able to demonstrate capability in a new context.`
      },
      worksheet_blueprint: worksheetBlueprint
    },
    quality_controls: {
      required_sections_present: [
        "orientation",
        "knowledge_context_framing",
        "core_definitions_and_distinctions",
        "theoretical_overview",
        "abstract_or_formal_structure",
        "real_manifestation",
        "application_and_embodiment",
        "integration",
        "capability_statement",
        "worksheet_blueprint"
      ],
      inference_assumptions: ["Deterministic fallback plan generated without LLM"]
    }
  };
};

export class FakeLessonModelAdapter extends LessonModelAdapter {
  async generate(input: GenerateModelInput): Promise<string> {
    if (input.stage === "plan") {
      if (!input.reasoningContext) {
        throw new Error("Fake adapter plan stage requires reasoningContext with request metadata.");
      }
      const request = input.reasoningContext.lesson_plan.generation_context;
      const normalized: NormalizedRequest = {
        request_id: request.request_id,
        timestamp: new Date().toISOString(),
        topic: request.topic,
        topic_focus: request.topic_focus,
        requested_output_type: request.requested_output_type,
        explicit_audience: request.explicit_audience,
        worksheet_header_name: request.worksheet_header_name,
        worksheet_header_date: request.worksheet_header_date,
        worksheet_header_description: request.worksheet_header_description,
        explicit_domain: request.explicit_domain as NormalizedRequest["explicit_domain"],
        explicit_subdomain: request.explicit_subdomain,
        topic_id: request.topic_id,
        topic_source: request.topic_source,
        current_knowledge_context: input.reasoningContext.learner_model.current_knowledge_context,
        target_knowledge_context: input.reasoningContext.learner_model.target_knowledge_context,
        requested_depth: request.requested_depth,
        worksheet_response_format: request.worksheet_response_format ?? "auto",
        worksheet_content_mode: request.worksheet_content_mode ?? "full",
        user_constraints: request.user_constraints ?? [],
        source_request_text: request.source_request_text
      };
      const plan = buildDeterministicLessonPlan(normalized, input.reasoningContext.learner_model);
      return JSON.stringify(plan);
    }

    if (input.stage === "render") {
      if (!input.reasoningContext) {
        throw new Error("Fake adapter render stage requires reasoningContext.");
      }
      return renderWorksheetFromPlan(
        input.reasoningContext.lesson_plan,
        input.reasoningContext.learner_model,
        input.reasoningContext.output_contract.worksheet_content_mode
      );
    }

    return JSON.stringify({ audit: "skipped in fake adapter" });
  }
}
