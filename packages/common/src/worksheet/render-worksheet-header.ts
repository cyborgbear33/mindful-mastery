export type WorksheetHeaderInput = {
  name?: string;
  date?: string;
  description?: string;
};

export const formatWorksheetHeaderDate = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    }
  }

  return trimmed;
};

export const renderWorksheetHeader = (input: WorksheetHeaderInput): string => {
  const lines: string[] = [];
  const name = input.name?.trim();
  const date = input.date?.trim();
  const description = input.description?.trim();

  if (name) lines.push(`**Name:** ${name}`);
  if (date) lines.push(`**Date:** ${formatWorksheetHeaderDate(date)}`);
  if (description) lines.push(`**Notes:** ${description}`);

  if (lines.length === 0) return "";
  return `${lines.join("\n")}\n\n---\n\n`;
};

export const hasWorksheetHeader = (input: WorksheetHeaderInput): boolean =>
  Boolean(input.name?.trim() || input.date?.trim() || input.description?.trim());
