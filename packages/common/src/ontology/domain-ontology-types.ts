import { z } from "zod";
import { LearningDomainSchema } from "../lesson-types";

export const ComplexityBandSchema = z.enum(["foundational", "intermediate", "advanced"]);

export const OntologyTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  complexity_index: z.number().int().min(1)
});

export const OntologySubdomainSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  complexity_index: z.number().int().min(1),
  complexity_band: ComplexityBandSchema,
  description: z.string().min(1),
  topics: z.array(OntologyTopicSchema).min(1)
});

export const DomainDefinitionSchema = z.object({
  label: z.string().min(1),
  description: z.string().min(1),
  min_required_subdomains: z.number().int().min(1),
  subdomains: z.array(OntologySubdomainSchema).min(1)
});

export const DomainOntologySchema = z.object({
  spec_name: z.string().min(1),
  spec_version: z.string().min(1),
  description: z.string().optional(),
  domains: z.object({
    self: DomainDefinitionSchema,
    trivium: DomainDefinitionSchema,
    quadrivium: DomainDefinitionSchema,
    science_analysis: DomainDefinitionSchema,
    engineering_art_architecture_craftsmanship: DomainDefinitionSchema,
    integration_theory_of_all: DomainDefinitionSchema
  })
});

export type DomainOntology = z.infer<typeof DomainOntologySchema>;
export type DomainDefinition = z.infer<typeof DomainDefinitionSchema>;
export type OntologySubdomain = z.infer<typeof OntologySubdomainSchema>;
export type OntologyTopic = z.infer<typeof OntologyTopicSchema>;
export type ComplexityBand = z.infer<typeof ComplexityBandSchema>;

export const DOMAIN_MINIMUMS: Record<z.infer<typeof LearningDomainSchema>, number> = {
  self: 32,
  trivium: 34,
  quadrivium: 36,
  science_analysis: 32,
  engineering_art_architecture_craftsmanship: 32,
  integration_theory_of_all: 32
};
