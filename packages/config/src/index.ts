import { z } from "zod";

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CURSOR_API_KEY: z.string().optional(),
  CURSOR_MODEL_ID: z.string().default("composer-2"),
  GUIDANCE_TOKEN_BUDGET_CHARS: z.coerce.number().default(9000),
  REPO_ROOT: z.string().optional(),
  PERSISTENCE_DIR: z.string().default(".data/lessons"),
  WEB_API_URL: z.string().default("http://localhost:4000")
});

export type Env = z.infer<typeof EnvSchema>;

export const loadEnv = (input: Record<string, string | undefined>): Env =>
  EnvSchema.parse(input);
