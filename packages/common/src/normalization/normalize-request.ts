import { randomUUID } from "node:crypto";
import {
  LearningDomain,
  LessonRequest,
  LessonRequestSchema,
  NormalizedRequest
} from "../lesson-types";

const DOMAIN_LABELS: Record<LearningDomain, string> = {
  self: "Self",
  trivium: "Trivium",
  quadrivium: "Quadrivium",
  science_analysis: "Science / Analysis",
  engineering_art_architecture_craftsmanship: "Engineering / Art / Craft",
  integration_theory_of_all: "Integration"
};

export const humanizeToken = (value: string): string =>
  value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const resolvePlacementScope = (
  request: Pick<LessonRequest, "explicit_domain" | "explicit_subdomain">
): string => {
  if (!request.explicit_domain) {
    return "General study";
  }

  const domainLabel =
    DOMAIN_LABELS[request.explicit_domain] ?? humanizeToken(request.explicit_domain);

  if (request.explicit_subdomain?.trim()) {
    const subdomainLabel = humanizeToken(request.explicit_subdomain.trim());
    return `${subdomainLabel} within ${domainLabel}`;
  }

  return `${domainLabel} domain scope`;
};

export const resolveLessonTopic = (
  request: Pick<LessonRequest, "topic" | "explicit_domain" | "explicit_subdomain">
): string => {
  const focus = request.topic?.trim();
  if (focus) return focus;
  return resolvePlacementScope(request);
};

export const buildPlacementContextLines = (
  request: Pick<
    NormalizedRequest,
    "explicit_domain" | "explicit_subdomain" | "topic_focus" | "topic"
  >
): string[] => {
  const lines: string[] = [];

  if (request.explicit_domain) {
    lines.push(`Domain: ${request.explicit_domain}`);
  }
  if (request.explicit_subdomain) {
    lines.push(`Subdomain: ${request.explicit_subdomain}`);
  }
  if (request.topic_focus) {
    lines.push(`Topic focus: ${request.topic_focus}`);
    lines.push(
      "Placement rule: narrow the lesson to this focus within the selected domain and subdomain."
    );
  } else {
    lines.push("Topic focus: not specified");
    lines.push(
      "Placement rule: plan for the full scope of the selected domain/subdomain without assuming a narrower subtopic."
    );
  }
  lines.push(`Resolved lesson title: ${request.topic}`);

  return lines;
};

export const normalizeRequest = (input: LessonRequest): NormalizedRequest => {
  const request = LessonRequestSchema.parse(input);
  const topicFocus = request.topic?.trim() || undefined;
  const resolvedTopic = resolveLessonTopic(request);

  const sourceText =
    request.source_request_text?.trim() ||
    [
      ...buildPlacementContextLines({
        explicit_domain: request.explicit_domain,
        explicit_subdomain: request.explicit_subdomain,
        topic_focus: topicFocus,
        topic: resolvedTopic
      }),
      `Output type: ${request.requested_output_type}`,
      request.explicit_audience ? `Audience: ${request.explicit_audience}` : "",
      request.worksheet_header_name ? `Worksheet name: ${request.worksheet_header_name}` : "",
      request.worksheet_header_date ? `Worksheet date: ${request.worksheet_header_date}` : "",
      request.worksheet_header_description
        ? `Worksheet notes: ${request.worksheet_header_description}`
        : "",
      request.topic_id ? `Topic ID: ${request.topic_id}` : "",
      request.current_knowledge_context
        ? `Current knowledge context: ${request.current_knowledge_context}`
        : "",
      request.target_knowledge_context
        ? `Target knowledge context: ${request.target_knowledge_context}`
        : "",
      `Depth: ${request.requested_depth}`,
      `Worksheet response format: ${request.worksheet_response_format}`,
      `Worksheet content mode: ${request.worksheet_content_mode}`,
      request.user_constraints.length > 0
        ? `Constraints: ${request.user_constraints.join("; ")}`
        : ""
    ]
      .filter(Boolean)
      .join("\n");

  return {
    request_id: randomUUID(),
    timestamp: new Date().toISOString(),
    topic: resolvedTopic,
    topic_focus: topicFocus,
    requested_output_type: request.requested_output_type,
    explicit_audience: request.explicit_audience,
    worksheet_header_name: request.worksheet_header_name,
    worksheet_header_date: request.worksheet_header_date,
    worksheet_header_description: request.worksheet_header_description,
    explicit_domain: request.explicit_domain,
    explicit_subdomain: request.explicit_subdomain,
    topic_id: request.topic_id,
    topic_source: request.topic_source ?? (request.topic_id ? "ontology" : "free_text"),
    current_knowledge_context: request.current_knowledge_context,
    target_knowledge_context: request.target_knowledge_context,
    requested_depth: request.requested_depth,
    worksheet_response_format: request.worksheet_response_format,
    worksheet_content_mode: request.worksheet_content_mode,
    user_constraints: request.user_constraints,
    source_request_text: sourceText,
    model_id: request.model_id
  };
};
