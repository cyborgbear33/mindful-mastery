export type WorksheetTitleSuffix = "Worksheet" | "Practice" | "Information";

type WorksheetTitleBlockInput = {
  title: string;
  domain: string;
  adjacentDomains: string[];
  suffix: WorksheetTitleSuffix;
};

export const renderWorksheetTitleBlock = (input: WorksheetTitleBlockInput): string[] => [
  `# ${input.title} — ${input.suffix}`,
  "",
  "## Worksheet Title",
  `${input.title} (${input.domain})`,
  `**Adjacent domains:** ${input.adjacentDomains.join(", ")}`
];

export const renderPracticeTitleBlock = (input: Omit<WorksheetTitleBlockInput, "suffix">): string[] => [
  `# ${input.title} — Practice`,
  `${input.title} (${input.domain})`,
  `**Adjacent domains:** ${input.adjacentDomains.join(", ")}`
];
