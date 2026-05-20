import { LearningDomain } from "../lesson-types";
import { loadDomainOntology } from "./load-domain-ontology";

export type SearchTopicsInput = {
  query: string;
  domain?: LearningDomain;
  subdomain?: string;
  limit?: number;
  sortByComplexity?: boolean;
};

export type TopicSearchResult = {
  domain: LearningDomain;
  subdomain_id: string;
  subdomain_label: string;
  topic_id: string;
  topic_title: string;
  complexity_index: number;
};

export const searchTopics = (input: SearchTopicsInput): TopicSearchResult[] => {
  const ontology = loadDomainOntology();
  const query = input.query.trim().toLowerCase();
  const limit = input.limit ?? 50;
  const sortByComplexity = input.sortByComplexity ?? true;

  const domainEntries = Object.entries(ontology.domains).filter(([domainId]) => {
    if (!input.domain) return true;
    return domainId === input.domain;
  }) as [LearningDomain, (typeof ontology.domains)[LearningDomain]][];

  const results: TopicSearchResult[] = [];

  for (const [domainId, domainDef] of domainEntries) {
    for (const subdomain of domainDef.subdomains) {
      if (input.subdomain && subdomain.id !== input.subdomain) {
        continue;
      }

      for (const topic of subdomain.topics) {
        const title = topic.title.toLowerCase();
        const topicId = topic.id.toLowerCase();
        const subdomainId = subdomain.id.toLowerCase();
        const subdomainLabel = subdomain.label.toLowerCase();

        if (
          query.length > 0 &&
          !title.includes(query) &&
          !topicId.includes(query) &&
          !subdomainId.includes(query) &&
          !subdomainLabel.includes(query)
        ) {
          continue;
        }

        results.push({
          domain: domainId,
          subdomain_id: subdomain.id,
          subdomain_label: subdomain.label,
          topic_id: topic.id,
          topic_title: topic.title,
          complexity_index: topic.complexity_index
        });
      }
    }
  }

  const sorted = results.sort((a, b) => {
    if (sortByComplexity && a.complexity_index !== b.complexity_index) {
      return a.complexity_index - b.complexity_index;
    }
    return a.topic_title.localeCompare(b.topic_title);
  });

  return sorted.slice(0, limit);
};
