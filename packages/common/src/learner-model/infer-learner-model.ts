import {
  LearnerModel,
  LearningDomain,
  NormalizedRequest
} from "../lesson-types";

const DOMAIN_DEFAULTS: Record<
  LearningDomain,
  { current: string; target: string; transformation: string }
> = {
  self: {
    current: "Understands the language of self-governance but lacks stable execution habits in attention and discipline.",
    target: "Can consistently apply attention and discipline practices to govern learning behavior.",
    transformation: "Move from inconsistent self-governance knowledge to applied self-governance capability."
  },
  trivium: {
    current: "Recognizes key terms but cannot reliably produce precise definitions and distinctions.",
    target: "Can define terms precisely and distinguish closely related concepts during reasoning.",
    transformation: "Move from verbal familiarity to reliable definitional and logical precision."
  },
  quadrivium: {
    current: "Can execute procedures but has fragmented understanding of mathematical structure and abstraction.",
    target: "Can explain and apply mathematical structures across unfamiliar quantitative contexts.",
    transformation: "Move from procedural execution to structural mathematical understanding."
  },
  science_analysis: {
    current: "Collects observations but inconsistently separates observation, inference, and causal claims.",
    target: "Can design observations and analyses with explicit evidence boundaries and causal caution.",
    transformation: "Move from mixed evidence reasoning to disciplined analytical interpretation."
  },
  engineering_art_architecture_craftsmanship: {
    current: "Has practical exposure but incomplete understanding of design tradeoffs and material constraints.",
    target: "Can reason through design decisions with explicit function, aesthetics, and material tradeoffs.",
    transformation: "Move from ad hoc making to explicit design reasoning."
  },
  integration_theory_of_all: {
    current: "Knows isolated ideas from multiple domains but lacks a coherent integrative framework.",
    target: "Can synthesize cross-domain concepts into a consistent explanatory architecture.",
    transformation: "Move from fragmented domain knowledge to coherent integrative synthesis."
  }
};

export const inferLearnerModel = (request: NormalizedRequest): LearnerModel => {
  const hasExplicit =
    Boolean(request.current_knowledge_context) || Boolean(request.target_knowledge_context);

  const domain = request.explicit_domain ?? "self";
  const defaults = DOMAIN_DEFAULTS[domain];

  return {
    current_knowledge_context:
      request.current_knowledge_context?.trim() ||
      defaults.current,
    target_knowledge_context:
      request.target_knowledge_context?.trim() ||
      defaults.target,
    transformation_goal: hasExplicit
      ? `Move from ${request.current_knowledge_context ?? "current knowledge context"} toward ${request.target_knowledge_context ?? "target knowledge context"}.`
      : defaults.transformation,
    confidence_of_inference: hasExplicit ? "explicit" : "inferred_conservative",
    confusions: hasExplicit
      ? []
      : ["May conflate familiar terms with precise understanding", "May treat topic as purely informational"],
    strengths: hasExplicit ? [] : ["Motivated to learn", "Has basic topic exposure"],
    readiness_level:
      request.requested_depth === "introductory"
        ? "novice"
        : request.requested_depth === "advanced"
          ? "advanced"
          : "intermediate"
  };
};
