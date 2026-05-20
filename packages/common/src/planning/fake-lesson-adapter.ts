import {
  LearnerModel,
  LessonPlanObject,
  NormalizedRequest,
  WorksheetContentMode,
  WorksheetItem
} from "../lesson-types";
import { getWorksheetModeDefinition } from "../worksheet/worksheet-content-modes";
import { renderWorksheetHeader } from "../worksheet/render-worksheet-header";
import { GenerateModelInput, LessonModelAdapter } from "./model-adapter";

const formatItems = (items: { prompt: string; purpose: string }[]) =>
  items.map((item, i) => `${i + 1}. ${item.prompt}\n   _Purpose: ${item.purpose}_`).join("\n\n");

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

const headerFromLessonPlan = (lessonPlan: LessonPlanObject): string =>
  renderWorksheetHeader({
    name: lessonPlan.generation_context.worksheet_header_name,
    date: lessonPlan.generation_context.worksheet_header_date,
    description: lessonPlan.generation_context.worksheet_header_description
  });

const renderFullWorksheet = (
  lessonPlan: LessonPlanObject,
  learnerModel: LearnerModel
): string => {
  const wb = lessonPlan.lesson_blueprint.worksheet_blueprint;
  const bp = lessonPlan.lesson_blueprint;

  return [
    `# ${lessonPlan.topic_model.title}`,
    "",
    "## Worksheet Title and Domain Placement",
    `**Primary domain:** ${lessonPlan.constitutional_alignment.primary_domain}`,
    `**Adjacent domains:** ${lessonPlan.constitutional_alignment.adjacent_domains.join(", ")}`,
    lessonPlan.lesson_blueprint.orientation.content,
    "",
    "## Learner Orientation",
    `**Current knowledge context:** ${learnerModel.current_knowledge_context}`,
    `**Target knowledge context:** ${learnerModel.target_knowledge_context}`,
    `**Transformation:** ${learnerModel.transformation_goal}`,
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

  return [
    `# ${lessonPlan.topic_model.title} — Practice`,
    "",
    "## Worksheet Title",
    `${lessonPlan.topic_model.title} (${lessonPlan.constitutional_alignment.primary_domain})`,
    "",
    "## Brief Learner Orientation",
    `You are moving from: ${learnerModel.current_knowledge_context}`,
    `You are working toward: ${learnerModel.target_knowledge_context}`,
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

const renderInformationOnlyWorksheet = (
  lessonPlan: LessonPlanObject,
  learnerModel: LearnerModel
): string => {
  const bp = lessonPlan.lesson_blueprint;

  return [
    `# ${lessonPlan.topic_model.title}`,
    "",
    "## Worksheet Title and Domain Placement",
    `**Primary domain:** ${lessonPlan.constitutional_alignment.primary_domain}`,
    `**Adjacent domains:** ${lessonPlan.constitutional_alignment.adjacent_domains.join(", ")}`,
    bp.orientation.content,
    "",
    "## Learner Orientation",
    `**Current knowledge context:** ${learnerModel.current_knowledge_context}`,
    `**Target knowledge context:** ${learnerModel.target_knowledge_context}`,
    `**Transformation:** ${learnerModel.transformation_goal}`,
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

export const buildDeterministicLessonPlan = (
  request: NormalizedRequest,
  learnerModel: LearnerModel
): LessonPlanObject => {
  const lessonId = `lesson-${request.request_id.slice(0, 8)}`;
  const domain = request.explicit_domain ?? "self";
  const modeDefinition = getWorksheetModeDefinition(request.worksheet_content_mode);
  const minimums = modeDefinition.practice_minimums;
  const exerciseCount = Math.max(minimums.exercises, 1);
  const observationCount = Math.max(minimums.observation_tasks, 1);
  const reflectionCount = Math.max(minimums.reflection_prompts, 1);
  const selfCheckCount = Math.max(minimums.self_check_items, 1);

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
      placement_notes: request.explicit_subdomain
        ? `Topic was scoped under subdomain ${request.explicit_subdomain}.`
        : "Topic was provided without subdomain scoping."
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
      worksheet_blueprint: {
        exercises: buildPracticeItems(request.topic, "exercise", exerciseCount),
        observation_tasks: buildPracticeItems(request.topic, "observation", observationCount),
        reflection_prompts: buildPracticeItems(request.topic, "reflection", reflectionCount),
        self_check_items: buildPracticeItems(request.topic, "self_check", selfCheckCount),
        capability_checkpoint: `Demonstrate understanding of ${request.topic} by completing all exercises and explaining one real-world connection.`
      }
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
