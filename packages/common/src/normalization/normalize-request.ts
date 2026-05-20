import { randomUUID } from "node:crypto";
import { LessonRequest, LessonRequestSchema, NormalizedRequest } from "../lesson-types";

export const normalizeRequest = (input: LessonRequest): NormalizedRequest => {
  const request = LessonRequestSchema.parse(input);
  const sourceText =
    request.source_request_text?.trim() ||
    [
      `Topic: ${request.topic}`,
      `Output type: ${request.requested_output_type}`,
      request.explicit_audience ? `Audience: ${request.explicit_audience}` : "",
      request.explicit_domain ? `Domain: ${request.explicit_domain}` : "",
      request.explicit_subdomain ? `Subdomain: ${request.explicit_subdomain}` : "",
      request.topic_id ? `Topic ID: ${request.topic_id}` : "",
      request.current_knowledge_context
        ? `Current knowledge context: ${request.current_knowledge_context}`
        : "",
      request.target_knowledge_context
        ? `Target knowledge context: ${request.target_knowledge_context}`
        : "",
      `Depth: ${request.requested_depth}`,
      `Worksheet response format: ${request.worksheet_response_format}`,
      request.user_constraints.length > 0
        ? `Constraints: ${request.user_constraints.join("; ")}`
        : ""
    ]
      .filter(Boolean)
      .join("\n");

  return {
    request_id: randomUUID(),
    timestamp: new Date().toISOString(),
    topic: request.topic.trim(),
    requested_output_type: request.requested_output_type,
    explicit_audience: request.explicit_audience,
    explicit_domain: request.explicit_domain,
    explicit_subdomain: request.explicit_subdomain,
    topic_id: request.topic_id,
    topic_source: request.topic_source ?? (request.topic_id ? "ontology" : "free_text"),
    current_knowledge_context: request.current_knowledge_context,
    target_knowledge_context: request.target_knowledge_context,
    requested_depth: request.requested_depth,
    worksheet_response_format: request.worksheet_response_format,
    user_constraints: request.user_constraints,
    source_request_text: sourceText,
    model_id: request.model_id
  };
};
