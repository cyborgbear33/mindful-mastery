import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GenerateLessonResponse } from "../lesson-types";

export const persistLessonArtifacts = async (
  response: GenerateLessonResponse,
  persistenceDir: string
): Promise<string> => {
  const lessonId = response.lesson_plan.spec_metadata.lesson_id;
  const dir = join(persistenceDir, lessonId);
  await mkdir(dir, { recursive: true });

  const basePath = join(dir, response.normalized_request.request_id);
  await writeFile(`${basePath}.json`, JSON.stringify(response, null, 2), "utf8");
  await writeFile(`${basePath}-worksheet.md`, response.worksheet, "utf8");

  return basePath;
};
