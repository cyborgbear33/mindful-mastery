import {
  LearnerModel,
  LessonPlanObject,
  NormalizedRequest,
  ReasoningContext
} from "../lesson-types";
import { GenerateModelInput, LessonModelAdapter } from "./model-adapter";

const renderWorksheetFromPlan = (
  lessonPlan: LessonPlanObject,
  learnerModel: LearnerModel
): string => {
  const wb = lessonPlan.lesson_blueprint.worksheet_blueprint;
  const formatItems = (items: { prompt: string; purpose: string }[]) =>
    items.map((item, i) => `${i + 1}. ${item.prompt}\n   _Purpose: ${item.purpose}_`).join("\n\n");

  return [
    `# ${lessonPlan.topic_model.title}`,
    "",
    "## Worksheet Title and Domain Placement",
    `**Primary domain:** ${lessonPlan.constitutional_alignment.primary_domain}`,
    `**Adjacent domains:** ${lessonPlan.constitutional_alignment.adjacent_domains.join(", ")}`,
    lessonPlan.lesson_blueprint.orientation.content,
    "",
    "## Learner Orientation",
    `**Current state:** ${learnerModel.current_state}`,
    `**Target state:** ${learnerModel.target_state}`,
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

export const buildDeterministicLessonPlan = (
  request: NormalizedRequest,
  learnerModel: LearnerModel
): LessonPlanObject => {
  const lessonId = `lesson-${request.request_id.slice(0, 8)}`;
  const domain = request.explicit_domain ?? "self";

  return {
    spec_metadata: {
      spec_version: "1.0.0",
      lesson_id: lessonId,
      created_at: new Date().toISOString(),
      output_type: request.requested_output_type,
      parent_request_id: request.request_id
    },
    constitutional_alignment: {
      primary_domain: domain,
      adjacent_domains: domain === "self" ? ["trivium"] : ["self"],
      transformation_goal: learnerModel.transformation_goal,
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
      explicit_domain: request.explicit_domain,
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
      ]
    },
    lesson_blueprint: {
      orientation: {
        title: "Orientation",
        content: `This lesson on ${request.topic} belongs primarily to the ${domain} domain.`
      },
      state_of_mind_framing: {
        title: "State of Mind Framing",
        content: `From: ${learnerModel.current_state} Toward: ${learnerModel.target_state}`
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
        exercises: [
          {
            prompt: `Explain ${request.topic} in your own words.`,
            purpose: "Verify conceptual grasp"
          },
          {
            prompt: `Apply ${request.topic} to a concrete example from your experience.`,
            purpose: "Embody understanding through use"
          }
        ],
        observation_tasks: [
          {
            prompt: `Observe one real instance of ${request.topic} in the next 24 hours. Record what you notice.`,
            purpose: "Ground theory in reality"
          }
        ],
        reflection_prompts: [
          {
            prompt: `Why does ${request.topic} matter for your learning?`,
            purpose: "Connect to why-it-matters framing"
          }
        ],
        self_check_items: [
          {
            prompt: `Can you define the key terms related to ${request.topic}?`,
            purpose: "Verify definition mastery"
          }
        ],
        capability_checkpoint: `Demonstrate understanding of ${request.topic} by completing all exercises and explaining one real-world connection.`
      }
    },
    quality_controls: {
      required_sections_present: [
        "orientation",
        "state_of_mind_framing",
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
        explicit_domain: request.explicit_domain as NormalizedRequest["explicit_domain"],
        requested_depth: request.requested_depth,
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
        input.reasoningContext.learner_model
      );
    }

    return JSON.stringify({ audit: "skipped in fake adapter" });
  }
}

export { renderWorksheetFromPlan };
