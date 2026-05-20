import Ajv2020 from "ajv/dist/2020";
import { AnySchemaObject } from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  DOMAIN_MINIMUMS,
  DomainOntology,
  DomainOntologySchema
} from "./domain-ontology-types";

const findFilePath = (relativePath: string): string => {
  const candidates = [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), "../../", relativePath),
    resolve(process.cwd(), "../../../", relativePath),
    resolve(process.cwd(), "../../../../", relativePath)
  ];

  for (const candidate of candidates) {
    try {
      readFileSync(candidate, "utf8");
      return candidate;
    } catch {
      // continue
    }
  }

  throw new Error(`Unable to locate required file: ${relativePath}`);
};

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const readYaml = (path: string): unknown => parseYaml(readFileSync(path, "utf8"));

const validateWithJsonSchema = (ontologyRaw: unknown): void => {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    removeAdditional: "all"
  });
  addFormats(ajv);
  const schemaPath = findFilePath("schemas/domain-ontology.schema.json");
  const schema = readJson(schemaPath) as AnySchemaObject;
  const validate = ajv.compile(schema);
  const valid = validate(ontologyRaw);
  if (!valid) {
    const errors = (validate.errors ?? []).map(
      (err) => `${err.instancePath || "/"} ${err.message ?? "invalid"}`
    );
    throw new Error(`Domain ontology JSON Schema validation failed: ${errors.join("; ")}`);
  }
};

const assertSortedComplexity = (ontology: DomainOntology): void => {
  for (const [domainId, domain] of Object.entries(ontology.domains)) {
    let prevSubdomainComplexity = -1;
    for (const subdomain of domain.subdomains) {
      if (subdomain.complexity_index < prevSubdomainComplexity) {
        throw new Error(
          `Domain ${domainId} subdomains are not sorted by complexity_index ascending.`
        );
      }
      prevSubdomainComplexity = subdomain.complexity_index;

      let prevTopicComplexity = -1;
      for (const topic of subdomain.topics) {
        if (topic.complexity_index < prevTopicComplexity) {
          throw new Error(
            `Domain ${domainId} subdomain ${subdomain.id} topics are not sorted by complexity_index ascending.`
          );
        }
        prevTopicComplexity = topic.complexity_index;
      }
    }
  }
};

const assertMinimumDepth = (ontology: DomainOntology): void => {
  for (const [domainId, minCount] of Object.entries(DOMAIN_MINIMUMS)) {
    const count = ontology.domains[domainId as keyof DomainOntology["domains"]].subdomains.length;
    if (count < minCount) {
      throw new Error(
        `Domain ${domainId} has ${count} subdomains but requires at least ${minCount}.`
      );
    }
  }
};

let cached: DomainOntology | null = null;

export const loadDomainOntology = (): DomainOntology => {
  if (cached) {
    return cached;
  }

  const ontologyPath = findFilePath("schemas/domain-ontology.yaml");
  const ontologyRaw = readYaml(ontologyPath);
  validateWithJsonSchema(ontologyRaw);

  const parsed = DomainOntologySchema.parse(ontologyRaw);
  assertMinimumDepth(parsed);
  assertSortedComplexity(parsed);

  cached = parsed;
  return parsed;
};

export const clearDomainOntologyCache = (): void => {
  cached = null;
};
