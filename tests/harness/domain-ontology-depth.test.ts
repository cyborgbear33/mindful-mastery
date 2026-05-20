import { describe, expect, it } from "vitest";
import { DOMAIN_MINIMUMS, loadDomainOntology } from "@mindful-mastery/common/index";

describe("domain ontology depth guardrail", () => {
  it("meets minimum subdomain counts per domain", () => {
    const ontology = loadDomainOntology();

    for (const [domain, minCount] of Object.entries(DOMAIN_MINIMUMS)) {
      const count = ontology.domains[domain as keyof typeof ontology.domains].subdomains.length;
      expect(count).toBeGreaterThanOrEqual(minCount);
    }
  });

  it("keeps subdomains complexity-sorted ascending in every domain", () => {
    const ontology = loadDomainOntology();
    for (const domain of Object.values(ontology.domains)) {
      for (let i = 1; i < domain.subdomains.length; i += 1) {
        expect(domain.subdomains[i].complexity_index).toBeGreaterThanOrEqual(
          domain.subdomains[i - 1].complexity_index
        );
      }
    }
  });
});
