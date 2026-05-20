import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { resolve } from "node:path";
import {
  FakeLessonModelAdapter,
  GenerateLessonResponse,
  LessonPipeline,
  LessonRequest,
  LessonRequestSchema
} from "@mindful-mastery/common/index";
import { loadEnv } from "@mindful-mastery/config/index";
import { CursorSdkLessonAdapter, LessonModelAdapter } from "../model-router/cursor-sdk-lesson-adapter";

@Injectable()
export class LessonService {
  private readonly env = loadEnv(process.env);
  private readonly repoRoot: string;

  constructor(private readonly modelAdapter?: LessonModelAdapter) {
    this.repoRoot = this.env.REPO_ROOT ?? resolve(process.cwd(), "../..");
  }

  async generateLesson(input: LessonRequest): Promise<GenerateLessonResponse> {
    const request = LessonRequestSchema.parse(input);
    const adapter = this.resolveAdapter(request.model_id);

    const pipeline = new LessonPipeline(adapter, {
      tokenBudgetChars: this.env.GUIDANCE_TOKEN_BUDGET_CHARS,
      repoRoot: this.repoRoot,
      persistenceDir: resolve(this.repoRoot, this.env.PERSISTENCE_DIR),
      useDeterministicPlan: adapter instanceof FakeLessonModelAdapter
    });

    try {
      return await pipeline.generate(request);
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Lesson generation failed.";
      throw new BadGatewayException(message);
    }
  }

  private resolveAdapter(modelId?: string): LessonModelAdapter {
    if (this.modelAdapter) {
      return this.modelAdapter;
    }

    if (!this.env.CURSOR_API_KEY) {
      throw new ServiceUnavailableException(
        "Lesson generation requires CURSOR_API_KEY. Set it in .env or use the fake adapter in tests."
      );
    }

    return new CursorSdkLessonAdapter(this.env.CURSOR_API_KEY, modelId ?? this.env.CURSOR_MODEL_ID);
  }
}
