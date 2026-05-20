import { LearningDomain } from "../lesson-types";
import { loadDomainOntology } from "./load-domain-ontology";

export type PlacementValidationInput = {
  domain?: LearningDomain;
  subdomain?: string;
  topicId?: string;
};

export type PlacementValidationResult = {
  valid: boolean;
  errors: string[];
};

export const validatePlacement = (
  input: PlacementValidationInput
): PlacementValidationResult => {
  const errors: string[] = [];

  if (!input.domain && (input.subdomain || input.topicId)) {
    errors.push("Domain is required when subdomain or topicId is provided.");
    return { valid: false, errors };
  }

  if (!input.domain) {
    return { valid: true, errors: [] };
  }

  const ontology = loadDomainOntology();
  const domain = ontology.domains[input.domain];

  if (!input.subdomain && !input.topicId) {
    return { valid: true, errors: [] };
  }

  const subdomain = domain.subdomains.find((s) => s.id === input.subdomain);
  if (input.subdomain && !subdomain) {
    errors.push(`Subdomain ${input.subdomain} does not exist under domain ${input.domain}.`);
  }

  if (input.topicId) {
    const candidateSubdomains = subdomain ? [subdomain] : domain.subdomains;
    const topicFound = candidateSubdomains.some((s) =>
      s.topics.some((topic) => topic.id === input.topicId)
    );
    if (!topicFound) {
      errors.push(
        `Topic ${input.topicId} is not present under domain ${input.domain}` +
          (input.subdomain ? ` and subdomain ${input.subdomain}` : ".")
      );
    }
  }

  return { valid: errors.length === 0, errors };
};
