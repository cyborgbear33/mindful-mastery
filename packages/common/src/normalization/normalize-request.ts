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
      request.explicit_student_state ? `Current state: ${request.explicit_student_state}` : "",
      request.explicit_target_state ? `Target state: ${request.explicit_target_state}` : "",
      `Depth: ${request.requested_depth}`,
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
    explicit_student_state: request.explicit_student_state,
    explicit_target_state: request.explicit_target_state,
    requested_depth: request.requested_depth,
    user_constraints: request.user_constraints,
    source_request_text: sourceText,
    model_id: request.model_id
  };
};
