import { z } from "zod";

export const LearningDomainSchema = z.enum([
  "self",
  "trivium",
  "quadrivium",
  "science_analysis",
  "engineering_art_architecture_craftsmanship",
  "integration_theory_of_all"
]);

export const OutputTypeSchema = z.enum([
  "lesson",
  "lesson_series",
  "unit",
  "course_module",
  "study_guide",
  "manual_section",
  "curriculum_segment",
  "worksheet"
]);

export const DepthLevelSchema = z.enum(["introductory", "standard", "advanced"]);
export const ReadinessLevelSchema = z.enum(["novice", "intermediate", "advanced"]);
export const InferenceConfidenceSchema = z.enum([
  "explicit",
  "inferred_conservative",
  "inferred_speculative"
]);

export const WorksheetContentModeSchema = z.enum([
  "full",
  "practice_only",
  "information_only"
]);

export const WorksheetResponseFormatSchema = z.enum([
  "auto",
  "open_ended",
  "fill_in",
  "multiple_choice",
  "true_false",
  "mixed",
  "quiz",
  "test"
]);

export const WorksheetItemResponseFormatSchema = z.enum([
  "open_ended",
  "fill_in",
  "multiple_choice",
  "true_false"
]);

export const LessonRequestSchema = z.object({
  topic: z.string().optional(),
  requested_output_type: OutputTypeSchema.default("worksheet"),
  explicit_audience: z.string().optional(),
  worksheet_header_name: z.string().optional(),
  worksheet_header_date: z.string().optional(),
  worksheet_header_description: z.string().optional(),
  explicit_domain: LearningDomainSchema.optional(),
  explicit_subdomain: z.string().optional(),
  topic_id: z.string().optional(),
  topic_source: z.enum(["ontology", "free_text"]).optional(),
  current_knowledge_context: z.string().optional(),
  target_knowledge_context: z.string().optional(),
  requested_depth: DepthLevelSchema.default("standard"),
  worksheet_response_format: WorksheetResponseFormatSchema.default("auto"),
  worksheet_content_mode: WorksheetContentModeSchema.default("full"),
  user_constraints: z.array(z.string()).default([]),
  source_request_text: z.string().optional(),
  model_id: z.string().optional()
});

export const NormalizedRequestSchema = z.object({
  request_id: z.string().min(1),
  timestamp: z.string().datetime(),
  topic: z.string().min(1),
  topic_focus: z.string().optional(),
  requested_output_type: OutputTypeSchema,
  explicit_audience: z.string().optional(),
  worksheet_header_name: z.string().optional(),
  worksheet_header_date: z.string().optional(),
  worksheet_header_description: z.string().optional(),
  explicit_domain: LearningDomainSchema.optional(),
  explicit_subdomain: z.string().optional(),
  topic_id: z.string().optional(),
  topic_source: z.enum(["ontology", "free_text"]).optional(),
  current_knowledge_context: z.string().optional(),
  target_knowledge_context: z.string().optional(),
  requested_depth: DepthLevelSchema,
  worksheet_response_format: WorksheetResponseFormatSchema,
  worksheet_content_mode: WorksheetContentModeSchema,
  user_constraints: z.array(z.string()),
  source_request_text: z.string().min(1),
  model_id: z.string().optional()
});

export const LearnerModelSchema = z.object({
  current_knowledge_context: z.string().min(1),
  target_knowledge_context: z.string().min(1),
  transformation_goal: z.string().min(1),
  confidence_of_inference: InferenceConfidenceSchema,
  confusions: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  readiness_level: ReadinessLevelSchema.optional()
});

export const DefinitionSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1)
});

export const DistinctionSchema = z.object({
  term_a: z.string().min(1),
  term_b: z.string().min(1),
  distinction: z.string().min(1)
});

export const BlueprintSectionSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  key_points: z.array(z.string()).optional()
});

export const WorksheetItemSchema = z.object({
  prompt: z.string().min(1),
  purpose: z.string().min(1),
  response_format: WorksheetItemResponseFormatSchema.default("open_ended"),
  practice_angle: z.string().optional(),
  options: z.array(z.string()).optional(),
  acceptable_answers: z.array(z.string()).optional(),
  expected_response_hint: z.string().optional()
});

export const WorksheetBlueprintSchema = z.object({
  exercises: z.array(WorksheetItemSchema).min(1),
  applied_scenarios: z.array(WorksheetItemSchema).optional(),
  observation_tasks: z.array(WorksheetItemSchema).min(1),
  reflection_prompts: z.array(WorksheetItemSchema).min(1),
  self_check_items: z.array(WorksheetItemSchema).min(1),
  capability_checkpoint: z.string().min(1)
});

export const FourLayerIntegritySchema = z.object({
  principle_present: z.boolean(),
  form_present: z.boolean(),
  manifestation_present: z.boolean(),
  embodiment_present: z.boolean()
});

export const SpecMetadataSchema = z.object({
  spec_version: z.string().min(1),
  lesson_id: z.string().min(1),
  created_at: z.string().datetime(),
  output_type: OutputTypeSchema,
  lineage: z.string().optional(),
  parent_request_id: z.string().optional()
});

export const ConstitutionalAlignmentSchema = z.object({
  primary_domain: LearningDomainSchema,
  primary_subdomain: z.string().optional(),
  adjacent_domains: z.array(LearningDomainSchema),
  transformation_goal: z.string().min(1),
  topic_id: z.string().optional(),
  topic_source: z.enum(["ontology", "free_text"]).optional(),
  four_layer_integrity: FourLayerIntegritySchema
});

export const GenerationContextSchema = z.object({
  request_id: z.string().min(1),
  topic: z.string().min(1),
  requested_output_type: OutputTypeSchema,
  requested_depth: DepthLevelSchema,
  source_request_text: z.string().min(1),
  explicit_audience: z.string().optional(),
  worksheet_header_name: z.string().optional(),
  worksheet_header_date: z.string().optional(),
  worksheet_header_description: z.string().optional(),
  explicit_domain: z.string().optional(),
  explicit_subdomain: z.string().optional(),
  topic_id: z.string().optional(),
  topic_source: z.enum(["ontology", "free_text"]).optional(),
  topic_focus: z.string().optional(),
  worksheet_response_format: WorksheetResponseFormatSchema.optional(),
  worksheet_content_mode: WorksheetContentModeSchema.optional(),
  user_constraints: z.array(z.string()).optional()
});

export const TopicModelSchema = z.object({
  title: z.string().min(1),
  why_it_matters: z.string().min(1),
  definitions: z.array(DefinitionSchema).min(1),
  distinctions: z.array(DistinctionSchema).min(1),
  subdomain: z.string().optional(),
  placement_notes: z.string().optional(),
  ontology_notes: z.string().optional()
});

export const LessonBlueprintSchema = z.object({
  orientation: BlueprintSectionSchema,
  knowledge_context_framing: BlueprintSectionSchema,
  core_definitions_and_distinctions: BlueprintSectionSchema,
  theoretical_overview: BlueprintSectionSchema,
  abstract_or_formal_structure: BlueprintSectionSchema,
  real_manifestation: BlueprintSectionSchema,
  application_and_embodiment: BlueprintSectionSchema,
  integration: BlueprintSectionSchema,
  capability_statement: BlueprintSectionSchema,
  worksheet_blueprint: WorksheetBlueprintSchema
});

export const QualityControlsSchema = z.object({
  required_sections_present: z.array(z.string()).min(1),
  inference_assumptions: z.array(z.string()).optional(),
  regeneration_notes: z.string().optional()
});

export const LessonPlanObjectSchema = z.object({
  spec_metadata: SpecMetadataSchema,
  constitutional_alignment: ConstitutionalAlignmentSchema,
  generation_context: GenerationContextSchema,
  student_model: LearnerModelSchema,
  topic_model: TopicModelSchema,
  lesson_blueprint: LessonBlueprintSchema,
  quality_controls: QualityControlsSchema
});

export const WorksheetPracticeMinimumsSchema = z.object({
  exercises: z.number().int().min(0),
  applied_scenarios: z.number().int().min(0).default(0),
  observation_tasks: z.number().int().min(0),
  reflection_prompts: z.number().int().min(0),
  self_check_items: z.number().int().min(0),
  min_practice_angles: z.number().int().min(0).default(0)
});

export const WorksheetOutputContractSchema = z.object({
  required_sections: z.array(z.string()),
  markdown_required: z.boolean(),
  min_heading_count: z.number(),
  min_output_requirement_coverage: z.number(),
  worksheet_response_format: WorksheetResponseFormatSchema.default("auto"),
  worksheet_content_mode: WorksheetContentModeSchema.default("full"),
  practice_minimums: WorksheetPracticeMinimumsSchema,
  omit_information_sections: z.boolean().default(false),
  omit_practice_sections: z.boolean().default(false)
});

export const GuidanceSnippetSchema = z.object({
  path: z.string(),
  priority: z.enum(["required", "mode-specific"]),
  excerpt: z.string()
});

export const ReasoningContextSchema = z.object({
  topic: z.string(),
  requested_output_type: OutputTypeSchema,
  lesson_plan: LessonPlanObjectSchema,
  learner_model: LearnerModelSchema,
  output_requirements: z.array(z.string()),
  output_contract: WorksheetOutputContractSchema,
  meta: z.object({
    guidance_used: z.array(GuidanceSnippetSchema),
    token_budget_chars: z.number(),
    guidance_chars_used: z.number(),
    authority_files_loaded: z.array(z.string())
  })
});

export const AuditCategoryScoreSchema = z.object({
  category: z.string(),
  score: z.number().min(0).max(4),
  notes: z.string().optional()
});

export const AuditResultSchema = z.object({
  audit_id: z.string(),
  lesson_id: z.string(),
  schema_pass: z.boolean(),
  constitutional_pass: z.boolean(),
  missing_sections: z.array(z.string()),
  fragmentation_risk: z.enum(["low", "medium", "high"]),
  category_scores: z.array(AuditCategoryScoreSchema),
  four_layer_integrity_pass: z.boolean(),
  summary_rating: z.enum([
    "constitutional_failure",
    "weak_but_salvageable",
    "constitutionally_functional",
    "constitutionally_strong",
    "constitutionally_excellent"
  ]),
  recommended_revision_actions: z.array(z.string()),
  drift_notes: z.string().optional()
});

export const QualityMetricsSchema = z.object({
  schema_valid: z.boolean(),
  schema_repair_attempted: z.boolean().default(false),
  schema_repair_succeeded: z.boolean().default(false),
  render_repair_attempted: z.boolean().default(false),
  render_repair_succeeded: z.boolean().default(false),
  worksheet_contract_valid: z.boolean(),
  audit_pass: z.boolean(),
  regeneration_count: z.number().default(0),
  heading_count: z.number().default(0),
  required_section_coverage: z.number().default(0)
});

export const GenerateLessonResponseSchema = z.object({
  normalized_request: NormalizedRequestSchema,
  learner_model: LearnerModelSchema,
  lesson_plan: LessonPlanObjectSchema,
  llm_prompt: z.string().min(1),
  reasoning_context: ReasoningContextSchema,
  worksheet: z.string().min(1),
  audit_result: AuditResultSchema,
  quality_metrics: QualityMetricsSchema,
  persisted_path: z.string().optional()
});

export type LearningDomain = z.infer<typeof LearningDomainSchema>;
export type OutputType = z.infer<typeof OutputTypeSchema>;
export type LessonRequest = z.infer<typeof LessonRequestSchema>;
export type NormalizedRequest = z.infer<typeof NormalizedRequestSchema>;
export type LearnerModel = z.infer<typeof LearnerModelSchema>;
export type LessonPlanObject = z.infer<typeof LessonPlanObjectSchema>;
export type ReasoningContext = z.infer<typeof ReasoningContextSchema>;
export type GuidanceSnippet = z.infer<typeof GuidanceSnippetSchema>;
export type AuditResult = z.infer<typeof AuditResultSchema>;
export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;
export type GenerateLessonResponse = z.infer<typeof GenerateLessonResponseSchema>;
export type WorksheetOutputContract = z.infer<typeof WorksheetOutputContractSchema>;
export type WorksheetContentMode = z.infer<typeof WorksheetContentModeSchema>;

export const REQUIRED_WORKSHEET_SECTIONS = [
  "Worksheet Title",
  "Learner Orientation",
  "Core Definitions and Distinctions",
  "Guided Exercises",
  "Observation / Application Tasks",
  "Reflection Prompts",
  "Self-Check",
  "Capability Checkpoint"
] as const;

export const AUDIT_CATEGORIES = [
  "Domain Placement",
  "Student Current-State Modeling",
  "Student Target-State Modeling",
  "Transformation-of-Mind Goal",
  "Why-It-Matters Framing",
  "Core Definitions",
  "Key Distinctions",
  "Theoretical Overview",
  "Abstract / Formal Layer",
  "Real-World Manifestation",
  "Application / Embodiment",
  "Common Errors and Corrections",
  "Integration with the Greater Whole",
  "Capability Gained",
  "Constitutional Style Fidelity"
] as const;
