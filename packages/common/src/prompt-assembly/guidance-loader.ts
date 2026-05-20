import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GuidanceSnippet } from "../lesson-types";

export const AUTHORITY_FILES = [
  { path: "AGENTS.md", priority: "required" as const },
  { path: "docs/constitution/master-constitution-of-learning.md", priority: "required" as const },
  {
    path: "docs/constitution/implementation-doctrine-for-ai-lesson-generation.md",
    priority: "required" as const
  },
  { path: "docs/runtime/lesson-generation-prompt-contract.md", priority: "required" as const },
  { path: "docs/runtime/worksheet-content-modes.md", priority: "mode-specific" as const },
  { path: "prompts/system/constitution-bound-lesson-architect.system.md", priority: "required" as const },
  { path: "prompts/developer/lesson-generation.developer.md", priority: "required" as const }
];

export const readRepoFile = async (relativePath: string, repoRoot?: string): Promise<string> => {
  const roots = repoRoot
    ? [repoRoot]
    : [
        process.cwd(),
        resolve(process.cwd(), ".."),
        resolve(process.cwd(), "../.."),
        resolve(process.cwd(), "../../..")
      ];
  for (const root of roots) {
    try {
      return await readFile(resolve(root, relativePath), "utf8");
    } catch {
      // try next
    }
  }
  throw new Error(`Unable to load file: ${relativePath}`);
};

export const loadGuidanceSnippets = async (
  tokenBudgetChars: number,
  repoRoot?: string
): Promise<{ snippets: GuidanceSnippet[]; filesLoaded: string[] }> => {
  let remainingBudget = tokenBudgetChars;
  const snippets: GuidanceSnippet[] = [];
  const filesLoaded: string[] = [];

  for (const resource of AUTHORITY_FILES) {
    if (remainingBudget <= 0) {
      break;
    }
    const raw = await readRepoFile(resource.path, repoRoot);
    filesLoaded.push(resource.path);
    const normalized = raw.replace(/\s+/g, " ").trim();
    const snippetLength = Math.min(remainingBudget, 1400);
    const excerpt = normalized.slice(0, snippetLength);
    snippets.push({ path: resource.path, priority: resource.priority, excerpt });
    remainingBudget -= excerpt.length;
  }

  return { snippets, filesLoaded };
};

export const loadPromptAsset = async (
  relativePath: string,
  repoRoot?: string
): Promise<string> => readRepoFile(relativePath, repoRoot);
