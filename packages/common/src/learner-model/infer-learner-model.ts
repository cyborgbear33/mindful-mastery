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
    current: "Scattered, lacking disciplined attention and moral seriousness about learning.",
    target: "Attentive, disciplined, morally engaged with the learning process.",
    transformation: "Move from scattered passivity to disciplined self-governance."
  },
  trivium: {
    current: "Verbally vague, lacking precise definitions and distinctions.",
    target: "Verbally precise, capable of clear definition and logical discrimination.",
    transformation: "Move from vague verbal familiarity to precise conceptual discrimination."
  },
  quadrivium: {
    current: "Procedurally competent but lacking structural mathematical insight.",
    target: "Capable of seeing quantity and structure as intelligible relations.",
    transformation: "Move from procedural arithmetic to structural mathematical insight."
  },
  science_analysis: {
    current: "Mixes observation and inference carelessly, interpretively blurred.",
    target: "Observationally rigorous, clear about what is seen vs inferred.",
    transformation: "Move from interpretive blur to observational discipline."
  },
  engineering_art_architecture_craftsmanship: {
    current: "Appreciates results but lacks design reasoning and material intelligence.",
    target: "Capable of design reasoning with attention to function, beauty, and material.",
    transformation: "Move from passive appreciation to active design intelligence."
  },
  integration_theory_of_all: {
    current: "Holds fragmented knowledge without synthesis or teleological order.",
    target: "Capable of integrating parts into coherent wholes with purpose.",
    transformation: "Move from fragmentation to integrative understanding."
  }
};

export const inferLearnerModel = (request: NormalizedRequest): LearnerModel => {
  const hasExplicit =
    Boolean(request.explicit_student_state) || Boolean(request.explicit_target_state);

  const domain = request.explicit_domain ?? "self";
  const defaults = DOMAIN_DEFAULTS[domain];

  return {
    current_state:
      request.explicit_student_state?.trim() ||
      defaults.current,
    target_state:
      request.explicit_target_state?.trim() ||
      defaults.target,
    transformation_goal: hasExplicit
      ? `Move from ${request.explicit_student_state ?? "current state"} toward ${request.explicit_target_state ?? "target state"}.`
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
