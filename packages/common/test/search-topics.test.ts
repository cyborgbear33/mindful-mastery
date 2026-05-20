import { describe, expect, it } from "vitest";
import { loadDomainOntology, searchTopics } from "../src/index";

describe("domain ontology loading", () => {
  it("loads ontology with required domain minimums", () => {
    const ontology = loadDomainOntology();

    expect(ontology.domains.self.subdomains.length).toBeGreaterThanOrEqual(32);
    expect(ontology.domains.trivium.subdomains.length).toBeGreaterThanOrEqual(34);
    expect(ontology.domains.quadrivium.subdomains.length).toBeGreaterThanOrEqual(36);
    expect(ontology.domains.science_analysis.subdomains.length).toBeGreaterThanOrEqual(32);
    expect(
      ontology.domains.engineering_art_architecture_craftsmanship.subdomains.length
    ).toBeGreaterThanOrEqual(32);
    expect(
      ontology.domains.integration_theory_of_all.subdomains.length
    ).toBeGreaterThanOrEqual(32);
  });
});

describe("searchTopics", () => {
  it("returns complexity-ordered results by default", () => {
    const results = searchTopics({
      query: "analysis",
      domain: "science_analysis",
      limit: 20
    });

    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i += 1) {
      expect(results[i].complexity_index).toBeGreaterThanOrEqual(
        results[i - 1].complexity_index
      );
    }
  });

  it("filters by subdomain when provided", () => {
    const results = searchTopics({
      query: "ratio",
      domain: "quadrivium",
      subdomain: "fractions_and_ratios",
      limit: 10
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.subdomain_id === "fractions_and_ratios")).toBe(true);
  });
});
