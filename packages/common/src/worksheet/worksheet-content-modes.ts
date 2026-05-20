import type { WorksheetContentMode } from "../lesson-types";
import { REQUIRED_WORKSHEET_SECTIONS } from "../lesson-types";

export type WorksheetPracticeMinimums = {
  exercises: number;
  observation_tasks: number;
  reflection_prompts: number;
  self_check_items: number;
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
    practice_minimums: {
      exercises: 3,
      observation_tasks: 2,
      reflection_prompts: 2,
      self_check_items: 2
    },
    omit_information_sections: false,
    omit_practice_sections: false
  },
  practice_only: {
    mode: "practice_only",
    label: "Practice Problems Only",
    teacherDescription:
      "Exercises and checks only — ideal for homework, review, warm-ups, or assessment.",
    required_sections: [
      "Worksheet Title",
      "Brief Learner Orientation",
      "Guided Exercises",
      "Observation / Application Tasks",
      "Reflection Prompts",
      "Self-Check",
      "Capability Checkpoint"
    ],
    min_heading_count: 6,
    min_output_requirement_coverage: 0.7,
    practice_minimums: {
      exercises: 6,
      observation_tasks: 3,
      reflection_prompts: 2,
      self_check_items: 3
    },
    omit_information_sections: true,
    omit_practice_sections: false
  },
  information_only: {
    mode: "information_only",
    label: "Lesson Information Only",
    teacherDescription:
      "Definitions and explanations without practice — use for teaching notes or reading before activities.",
    required_sections: [
      "Worksheet Title and Domain Placement",
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
      observation_tasks: 0,
      reflection_prompts: 0,
      self_check_items: 0
    },
    omit_information_sections: false,
    omit_practice_sections: true
  }
};

export const getWorksheetModeDefinition = (
  mode: WorksheetContentMode = "full"
): WorksheetModeDefinition => WORKSHEET_CONTENT_MODES[mode];
