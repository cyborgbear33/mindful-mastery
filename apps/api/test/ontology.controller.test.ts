import { describe, expect, it } from "vitest";
import { OntologyController } from "../src/modules/ontology/ontology.controller";

describe("OntologyController", () => {
  it("returns full ontology", () => {
    const controller = new OntologyController();
    const ontology = controller.getOntology();
    expect(ontology.spec_name).toContain("Ontology");
    expect(ontology.domains.quadrivium.subdomains.length).toBeGreaterThanOrEqual(36);
  });

  it("returns filtered topic search results", () => {
    const controller = new OntologyController();
    const results = controller.getTopics("ratio", "quadrivium", "fractions_and_ratios", "10");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.domain === "quadrivium")).toBe(true);
    expect(results.every((r) => r.subdomain_id === "fractions_and_ratios")).toBe(true);
  });
});
