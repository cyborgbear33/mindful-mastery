import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LessonPlanObjectSchema } from "../lesson-types";

let cachedValidator: ReturnType<Ajv2020["compile"]> | null = null;

const findSchemaPath = (): string => {
  const candidates = [
    resolve(process.cwd(), "schemas/lesson-generation.schema.json"),
    resolve(process.cwd(), "../../schemas/lesson-generation.schema.json"),
    resolve(process.cwd(), "../../../schemas/lesson-generation.schema.json")
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate, "utf8");
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error("Unable to locate lesson-generation.schema.json");
};

export const getSchemaValidator = (): ReturnType<Ajv2020["compile"]> => {
  if (cachedValidator) {
    return cachedValidator;
  }
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const schemaPath = findSchemaPath();
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  cachedValidator = ajv.compile(schema);
  return cachedValidator;
};

export type SchemaValidationResult = {
  valid: boolean;
  errors: string[];
};

export const validateLessonPlanSchema = (input: unknown): SchemaValidationResult => {
  const validate = getSchemaValidator();
  const valid = validate(input);
  if (valid) {
    return { valid: true, errors: [] };
  }
  const errors = (validate.errors ?? []).map(
    (err) => `${err.instancePath || "/"} ${err.message ?? "invalid"}`
  );
  return { valid: false, errors };
};

export const validateLessonPlanZod = (input: unknown) => {
  return LessonPlanObjectSchema.safeParse(input);
};

export const validateLessonPlan = (input: unknown): SchemaValidationResult => {
  const schemaResult = validateLessonPlanSchema(input);
  if (!schemaResult.valid) {
    return schemaResult;
  }
  const zodResult = validateLessonPlanZod(input);
  if (!zodResult.success) {
    return {
      valid: false,
      errors: zodResult.error.issues.map((issue: { path: (string | number)[]; message: string }) => `${issue.path.join(".")}: ${issue.message}`)
    };
  }
  return { valid: true, errors: [] };
};
