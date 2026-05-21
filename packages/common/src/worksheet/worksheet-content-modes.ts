import type { DepthLevel, WorksheetContentMode } from "../lesson-types";
import { REQUIRED_WORKSHEET_SECTIONS } from "../lesson-types";
import { getScaledPracticeMinimums } from "./practice-problem-ontology";

export type WorksheetPracticeMinimums = {
  exercises: number;
  applied_scenarios: number;
  observation_tasks: number;
  reflection_prompts: number;
  self_check_items: number;
  min_practice_angles: number;
};

export type WorksheetModeDefinition = {
  mode: WorksheetContentMode;
  label: string;
  teacherDescription: string;
  required_sections: readonly string[];
  min_heading_count: number;
  min_output_requirement_coverage: number;
  practice_minimums: WorksheetPracticeMinimums;
  omit_information_sections: boolean;
  omit_practice_sections: boolean;
  scales_practice_by_depth: boolean;
};

const FULL_PRACTICE_MINIMUMS: WorksheetPracticeMinimums = {
  exercises: 3,
  applied_scenarios: 0,
  observation_tasks: 2,
  reflection_prompts: 2,
  self_check_items: 2,
  min_practice_angles: 0
};

const PRACTICE_ONLY_BASE_MINIMUMS: WorksheetPracticeMinimums = {
  ...getScaledPracticeMinimums("standard"),
  min_practice_angles: getScaledPracticeMinimums("standard").min_practice_angles
};

export const WORKSHEET_CONTENT_MODES: Record<WorksheetContentMode, WorksheetModeDefinition> = {
  full: {
    mode: "full",
    label: "Complete Worksheet",
    teacherDescription:
      "Lesson information and practice problems together — best for a full lesson or handout.",
    required_sections: REQUIRED_WORKSHEET_SECTIONS,
    min_heading_count: 8,
    min_output_requirement_coverage: 0.6,
    practice_minimums: FULL_PRACTICE_MINIMUMS,
    omit_information_sections: false,
    omit_practice_sections: false,
    scales_practice_by_depth: false
  },
  practice_only: {
    mode: "practice_only",
    label: "Practice Problems Only",
    teacherDescription:
      "Dense, varied exercises across many problem types — ideal for homework, review, warm-ups, or assessment.",
    required_sections: [
      "Brief Learner Orientation",
      "Guided Exercises",
      "Applied Scenarios",
      "Pencil-and-Paper Workbook Problems",
      "Observation / Application Tasks",
      "Self-Check",
      "Capability Checkpoint",
      "Problem Type Key"
    ],
    min_heading_count: 8,
    min_output_requirement_coverage: 0.75,
    practice_minimums: PRACTICE_ONLY_BASE_MINIMUMS,
    omit_information_sections: true,
    omit_practice_sections: false,
    scales_practice_by_depth: true
  },
  information_only: {
    mode: "information_only",
    label: "Lesson Information Only",
    teacherDescription:
      "Definitions and explanations without practice — use for teaching notes or reading before activities.",
    required_sections: [
      "Worksheet Title",
      "Learner Orientation",
      "Core Definitions and Distinctions",
      "Theoretical Overview",
      "Real-World Examples",
      "Integration",
      "Capability Statement"
    ],
    min_heading_count: 6,
    min_output_requirement_coverage: 0.7,
    practice_minimums: {
      exercises: 0,
      applied_scenarios: 0,
      observation_tasks: 0,
      reflection_prompts: 0,
      self_check_items: 0,
      min_practice_angles: 0
    },
    omit_information_sections: false,
    omit_practice_sections: true,
    scales_practice_by_depth: false
  }
};

export const resolvePracticeMinimums = (
  mode: WorksheetContentMode = "full",
  depth: DepthLevel = "standard"
): WorksheetPracticeMinimums => {
  const definition = WORKSHEET_CONTENT_MODES[mode];
  if (!definition.scales_practice_by_depth) {
    return { ...definition.practice_minimums };
  }
  return { ...getScaledPracticeMinimums(depth) };
};

export const getWorksheetModeDefinition = (
  mode: WorksheetContentMode = "full"
): WorksheetModeDefinition => WORKSHEET_CONTENT_MODES[mode];
