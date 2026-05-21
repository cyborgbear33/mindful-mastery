import {
  GenerateLessonResponse,
  GenerateLessonResponseSchema,
  LessonPlanObject,
  LessonPlanObjectSchema,
  LessonRequest,
  QualityMetrics
} from "../lesson-types";
import { auditLesson } from "../auditing/audit-lesson";
import { inferLearnerModel } from "../learner-model/infer-learner-model";
import { normalizeRequest } from "../normalization/normalize-request";
import {
  buildDeterministicLessonPlan,
  buildPlannerStubPlan,
  FakeLessonModelAdapter,
  renderWorksheetFromPlan
} from "../planning/fake-lesson-adapter";
import { GenerateModelInput, LessonModelAdapter, parseJsonFromModel } from "../planning/model-adapter";
import { persistLessonArtifacts } from "../persistence/persist-lesson";
import {
  buildPlannerPrompt,
  buildPromptPackage,
  buildRepairPrompt,
  evaluateWorksheetContract
} from "../prompt-assembly/lesson-contract";
import { loadGuidanceSnippets, loadPromptAsset } from "../prompt-assembly/guidance-loader";
import { normalizeRenderedWorksheet } from "../worksheet/normalize-worksheet-markdown";
import { validateLessonPlan } from "../validation/schema-validator";

export type LessonPipelineOptions = {
  modelAdapter: LessonModelAdapter;
  tokenBudgetChars?: number;
  repoRoot?: string;
  persistenceDir?: string;
  maxSchemaRepairAttempts?: number;
  maxRenderRepairAttempts?: number;
  useDeterministicPlan?: boolean;
};

export class LessonPipeline {
  private static readonly guidanceLoadCache = new Map<
    string,
    Promise<Awaited<ReturnType<typeof loadGuidanceSnippets>>>
  >();
  private static readonly promptLoadCache = new Map<
    string,
    Promise<{ systemPrompt: string; developerPrompt: string }>
  >();

  private readonly tokenBudgetChars: number;
  private readonly repoRoot?: string;
  private readonly persistenceDir?: string;
  private readonly maxSchemaRepairAttempts: number;
  private readonly maxRenderRepairAttempts: number;
  private readonly useDeterministicPlan: boolean;

  constructor(private readonly modelAdapter: LessonModelAdapter, options: Omit<LessonPipelineOptions, "modelAdapter"> = {}) {
    this.tokenBudgetChars = options.tokenBudgetChars ?? 9000;
    this.repoRoot = options.repoRoot;
    this.persistenceDir = options.persistenceDir;
    this.maxSchemaRepairAttempts = options.maxSchemaRepairAttempts ?? 1;
    this.maxRenderRepairAttempts = options.maxRenderRepairAttempts ?? 1;
    this.useDeterministicPlan = options.useDeterministicPlan ?? false;
  }

  async generate(input: LessonRequest): Promise<GenerateLessonResponse> {
    const normalizedRequest = normalizeRequest(input);
    const learnerModel = inferLearnerModel(normalizedRequest);
    const useFastPracticeOnlyPath =
      normalizedRequest.requested_output_type === "worksheet" &&
      normalizedRequest.worksheet_content_mode === "practice_only";
    const useFastInformationOnlyRenderPath =
      normalizedRequest.requested_output_type === "worksheet" &&
      normalizedRequest.worksheet_content_mode === "information_only";

    const { snippets, filesLoaded } = useFastPracticeOnlyPath
      ? { snippets: [], filesLoaded: [] }
      : await this.getGuidanceSnippetsCached();

    let systemPrompt = "";
    let developerPrompt = "";
    if (!useFastPracticeOnlyPath) {
      const prompts = await this.getPromptAssetsCached();
      systemPrompt = prompts.systemPrompt;
      developerPrompt = prompts.developerPrompt;
    }

    let lessonPlan: LessonPlanObject;
    let schemaRepairAttempted = false;
    let schemaRepairSucceeded = false;

    if (
      useFastPracticeOnlyPath ||
      this.useDeterministicPlan ||
      this.modelAdapter instanceof FakeLessonModelAdapter
    ) {
      lessonPlan = buildDeterministicLessonPlan(normalizedRequest, learnerModel);
      if (useFastPracticeOnlyPath) {
        lessonPlan.quality_controls.inference_assumptions = [
          ...(lessonPlan.quality_controls.inference_assumptions ?? []),
          "Fast practice-only path used deterministic planning for lower latency."
        ];
      }
    } else {
      const planResult = await this.planWithRepair({
        normalizedRequest,
        learnerModel,
        guidanceSnippets: snippets,
        systemPrompt,
        developerPrompt
      });
      lessonPlan = planResult.lessonPlan;
      schemaRepairAttempted = planResult.repairAttempted;
      schemaRepairSucceeded = planResult.repairSucceeded;
    }

    const schemaValidation = validateLessonPlan(lessonPlan);
    if (!schemaValidation.valid) {
      throw new Error(`Lesson plan failed validation: ${schemaValidation.errors.join("; ")}`);
    }
    lessonPlan = LessonPlanObjectSchema.parse(lessonPlan);

    const { llmPrompt, reasoningContext } = buildPromptPackage({
      normalizedRequest,
      learnerModel,
      lessonPlan,
      guidanceSnippets: snippets,
      tokenBudgetChars: this.tokenBudgetChars,
      systemPrompt,
      developerPrompt
    });
    reasoningContext.meta.authority_files_loaded = filesLoaded;

    let renderRepairAttempted = false;
    let renderRepairSucceeded = false;
    let worksheet: string;
    if (useFastPracticeOnlyPath) {
      worksheet = renderWorksheetFromPlan(
        lessonPlan,
        learnerModel,
        normalizedRequest.worksheet_content_mode
      );
      lessonPlan.quality_controls.inference_assumptions = [
        ...(lessonPlan.quality_controls.inference_assumptions ?? []),
        "Fast practice-only path used deterministic rendering for lower latency."
      ];
    } else if (useFastInformationOnlyRenderPath) {
      worksheet = renderWorksheetFromPlan(
        lessonPlan,
        learnerModel,
        normalizedRequest.worksheet_content_mode
      );
      lessonPlan.quality_controls.inference_assumptions = [
        ...(lessonPlan.quality_controls.inference_assumptions ?? []),
        "Fast information-only path used deterministic rendering from planned lesson content."
      ];
    } else {
      try {
        worksheet = normalizeRenderedWorksheet(
          await this.modelAdapter.generate({
            llmPrompt,
            reasoningContext,
            modelId: normalizedRequest.model_id,
            stage: "render"
          })
        );
      } catch (error) {
        renderRepairAttempted = true;
        const message = error instanceof Error ? error.message : String(error);
        worksheet = renderWorksheetFromPlan(
          lessonPlan,
          learnerModel,
          normalizedRequest.worksheet_content_mode
        );
        lessonPlan.quality_controls.inference_assumptions = [
          ...(lessonPlan.quality_controls.inference_assumptions ?? []),
          `Render model call failed; used deterministic render fallback: ${message}`
        ];
      }
    }

    let contractEval = evaluateWorksheetContract(worksheet, reasoningContext);

    if (!contractEval.valid && !useFastPracticeOnlyPath && !useFastInformationOnlyRenderPath) {
      for (let attempt = 0; attempt < this.maxRenderRepairAttempts; attempt += 1) {
        renderRepairAttempted = true;
        const repairPrompt = buildRepairPrompt({
          originalPrompt: llmPrompt,
          originalWorksheet: worksheet,
          issues: contractEval.issues
        });
        try {
          worksheet = normalizeRenderedWorksheet(
            await this.modelAdapter.generate({
              llmPrompt: repairPrompt,
              reasoningContext,
              modelId: normalizedRequest.model_id,
              stage: "render"
            })
          );
        } catch {
          break;
        }
        contractEval = evaluateWorksheetContract(worksheet, reasoningContext);
        if (contractEval.valid) {
          renderRepairSucceeded = true;
          break;
        }
      }
    }

    if (!contractEval.valid) {
      const contractIssues = [...contractEval.issues];
      const fallbackPlans = [
        lessonPlan,
        buildDeterministicLessonPlan(normalizedRequest, learnerModel)
      ];

      for (const fallbackPlan of fallbackPlans) {
        const fallbackWorksheet = renderWorksheetFromPlan(
          fallbackPlan,
          learnerModel,
          normalizedRequest.worksheet_content_mode
        );
        const fallbackEval = evaluateWorksheetContract(fallbackWorksheet, reasoningContext);
        if (fallbackEval.valid) {
          worksheet = fallbackWorksheet;
          lessonPlan = fallbackPlan;
          contractEval = fallbackEval;
          renderRepairAttempted = true;
          lessonPlan.quality_controls.inference_assumptions = [
            ...(lessonPlan.quality_controls.inference_assumptions ?? []),
            `Deterministic worksheet render fallback used after contract issues: ${contractIssues.join("; ")}`
          ];
          break;
        }
      }
    }

    if (!contractEval.valid) {
      throw new Error(`Worksheet failed output contract: ${contractEval.issues.join("; ")}`);
    }

    const auditResult = auditLesson({
      lessonPlan,
      worksheet,
      schemaPass: schemaValidation.valid
    });

    const qualityMetrics: QualityMetrics = {
      schema_valid: schemaValidation.valid,
      schema_repair_attempted: schemaRepairAttempted,
      schema_repair_succeeded: schemaRepairSucceeded,
      render_repair_attempted: renderRepairAttempted,
      render_repair_succeeded: renderRepairSucceeded,
      worksheet_contract_valid: contractEval.valid,
      audit_pass: auditResult.constitutional_pass,
      regeneration_count: (schemaRepairAttempted ? 1 : 0) + (renderRepairAttempted ? 1 : 0),
      heading_count: contractEval.metrics.heading_count,
      required_section_coverage: contractEval.metrics.required_section_coverage
    };

    const response = GenerateLessonResponseSchema.parse({
      normalized_request: normalizedRequest,
      learner_model: learnerModel,
      lesson_plan: lessonPlan,
      llm_prompt: llmPrompt,
      reasoning_context: reasoningContext,
      worksheet,
      audit_result: auditResult,
      quality_metrics: qualityMetrics
    });

    if (this.persistenceDir) {
      const persistedPath = await persistLessonArtifacts(response, this.persistenceDir);
      response.persisted_path = persistedPath;
    }

    return response;
  }

  private async getGuidanceSnippetsCached(): Promise<{
    snippets: Awaited<ReturnType<typeof loadGuidanceSnippets>>["snippets"];
    filesLoaded: string[];
  }> {
    const key = `${this.repoRoot ?? "__default__"}::${this.tokenBudgetChars}`;
    let cachedPromise = LessonPipeline.guidanceLoadCache.get(key);
    if (!cachedPromise) {
      cachedPromise = loadGuidanceSnippets(this.tokenBudgetChars, this.repoRoot);
      LessonPipeline.guidanceLoadCache.set(key, cachedPromise);
    }
    const loaded = await cachedPromise;
    return {
      snippets: loaded.snippets.map((snippet) => ({ ...snippet })),
      filesLoaded: [...loaded.filesLoaded]
    };
  }

  private async getPromptAssetsCached(): Promise<{ systemPrompt: string; developerPrompt: string }> {
    const key = this.repoRoot ?? "__default__";
    let cachedPromise = LessonPipeline.promptLoadCache.get(key);
    if (!cachedPromise) {
      cachedPromise = (async () => {
        try {
          const [systemPrompt, developerPrompt] = await Promise.all([
            loadPromptAsset("prompts/system/constitution-bound-lesson-architect.system.md", this.repoRoot),
            loadPromptAsset("prompts/developer/lesson-generation.developer.md", this.repoRoot)
          ]);
          return { systemPrompt, developerPrompt };
        } catch {
          return {
            systemPrompt: "You are a constitution-bound lesson architect.",
            developerPrompt: "Build and render governed lesson artifacts."
          };
        }
      })();
      LessonPipeline.promptLoadCache.set(key, cachedPromise);
    }
    return cachedPromise;
  }

  private async planWithRepair(input: {
    normalizedRequest: ReturnType<typeof normalizeRequest>;
    learnerModel: ReturnType<typeof inferLearnerModel>;
    guidanceSnippets: Awaited<ReturnType<typeof loadGuidanceSnippets>>["snippets"];
    systemPrompt: string;
    developerPrompt: string;
  }): Promise<{ lessonPlan: LessonPlanObject; repairAttempted: boolean; repairSucceeded: boolean }> {
    const stubPlan = buildPlannerStubPlan(input.normalizedRequest, input.learnerModel);
    let repairErrors: string[] | undefined;
    let repairAttempted = false;
    let repairSucceeded = false;

    for (let attempt = 0; attempt <= this.maxSchemaRepairAttempts; attempt += 1) {
      const plannerPrompt = buildPlannerPrompt({
        normalizedRequest: input.normalizedRequest,
        learnerModel: input.learnerModel,
        guidanceSnippets: input.guidanceSnippets,
        systemPrompt: input.systemPrompt,
        developerPrompt: input.developerPrompt,
        repairErrors
      });

      let raw: string;
      try {
        raw = await this.modelAdapter.generate({
          llmPrompt: plannerPrompt,
          reasoningContext: {
            topic: input.normalizedRequest.topic,
            requested_output_type: input.normalizedRequest.requested_output_type,
            lesson_plan: stubPlan,
            learner_model: input.learnerModel,
            output_requirements: [],
            output_contract: {
              required_sections: [],
              markdown_required: false,
              min_heading_count: 0,
              min_output_requirement_coverage: 0,
              worksheet_response_format: "auto",
              worksheet_content_mode: input.normalizedRequest.worksheet_content_mode,
              practice_minimums: {
                exercises: 0,
                applied_scenarios: 0,
                observation_tasks: 0,
                reflection_prompts: 0,
                self_check_items: 0,
                min_practice_angles: 0
              },
              omit_information_sections: false,
              omit_practice_sections: false
            },
            meta: {
              guidance_used: input.guidanceSnippets,
              token_budget_chars: this.tokenBudgetChars,
              guidance_chars_used: 0,
              authority_files_loaded: []
            }
          },
          modelId: input.normalizedRequest.model_id,
          stage: "plan"
        } as GenerateModelInput);
      } catch (error) {
        repairErrors = [
          error instanceof Error ? error.message : "Model adapter failed during planning"
        ];
        repairAttempted = true;
        break;
      }

      let parsed: unknown;
      try {
        parsed = parseJsonFromModel(raw);
      } catch {
        repairErrors = ["Invalid JSON returned from planner"];
        repairAttempted = true;
        continue;
      }

      const validation = validateLessonPlan(parsed);
      if (validation.valid) {
        if (repairAttempted) repairSucceeded = true;
        return {
          lessonPlan: LessonPlanObjectSchema.parse(parsed),
          repairAttempted,
          repairSucceeded
        };
      }

      repairErrors = validation.errors;
      repairAttempted = true;
    }

    const fallbackPlan = buildDeterministicLessonPlan(
      input.normalizedRequest,
      input.learnerModel
    );
    fallbackPlan.quality_controls.inference_assumptions = [
      ...(fallbackPlan.quality_controls.inference_assumptions ?? []),
      `Fallback deterministic planner used due to planner output errors: ${
        repairErrors?.join("; ") ?? "unknown schema/planner failure"
      }`
    ];
    return {
      lessonPlan: fallbackPlan,
      repairAttempted: true,
      repairSucceeded: false
    };
  }
}

export const createFakePipeline = (options?: Omit<LessonPipelineOptions, "modelAdapter">) =>
  new LessonPipeline(new FakeLessonModelAdapter(), {
    ...options,
    useDeterministicPlan: true
  });
