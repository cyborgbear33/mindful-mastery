export type WorksheetContentMode = "full" | "practice_only" | "information_only";

export type GenerationLoadingPhase = {
  title: string;
  detail: string;
  weight: number;
};

export type GenerationLoadingSnapshot = {
  progress: number;
  phaseTitle: string;
  phaseDetail: string;
  statusLine: string;
  isLongRunning: boolean;
};

type GenerationLoadingProfile = {
  phases: GenerationLoadingPhase[];
  estimatedTotalMs: number;
  longRunningAfterMs: number;
  typicalRangeLabel: string;
};

const LOADING_PROFILES: Record<WorksheetContentMode, GenerationLoadingProfile> = {
  practice_only: {
    typicalRangeLabel: "30 sec – 2 min",
    estimatedTotalMs: 75_000,
    longRunningAfterMs: 90_000,
    phases: [
      {
        title: "Placing topic in domain",
        detail: "Normalizing domain, subdomain, depth, and problem format",
        weight: 8
      },
      {
        title: "Planning practice blueprint",
        detail: "AI is designing varied exercises across problem types",
        weight: 55
      },
      {
        title: "Validating structure",
        detail: "Checking lesson schema and practice minimums",
        weight: 12
      },
      {
        title: "Formatting practice handout",
        detail: "Rendering exercises, scenarios, and answer spaces",
        weight: 15
      },
      {
        title: "Running quality audit",
        detail: "Verifying section coverage before delivery",
        weight: 10
      }
    ]
  },
  full: {
    typicalRangeLabel: "1 – 4 min",
    estimatedTotalMs: 180_000,
    longRunningAfterMs: 180_000,
    phases: [
      {
        title: "Placing topic in domain",
        detail: "Normalizing request, learner context, and worksheet mode",
        weight: 5
      },
      {
        title: "Building lesson plan",
        detail: "AI is structuring teaching layers and practice items",
        weight: 40
      },
      {
        title: "Validating lesson plan",
        detail: "Checking constitutional structure against schema",
        weight: 10
      },
      {
        title: "Rendering full worksheet",
        detail: "AI is writing teaching sections and practice problems",
        weight: 35
      },
      {
        title: "Running quality audit",
        detail: "Verifying headings, exercises, and completeness",
        weight: 10
      }
    ]
  },
  information_only: {
    typicalRangeLabel: "45 sec – 3 min",
    estimatedTotalMs: 90_000,
    longRunningAfterMs: 120_000,
    phases: [
      {
        title: "Placing topic in domain",
        detail: "Normalizing request and learner context",
        weight: 8
      },
      {
        title: "Planning teaching content",
        detail: "AI is building definitions, overview, and examples",
        weight: 50
      },
      {
        title: "Validating structure",
        detail: "Checking lesson schema and required sections",
        weight: 12
      },
      {
        title: "Rendering information handout",
        detail: "Formatting reading sections without student exercises",
        weight: 20
      },
      {
        title: "Running quality audit",
        detail: "Verifying teaching sections before delivery",
        weight: 10
      }
    ]
  }
};

const PROGRESS_CAP_BEFORE_COMPLETE = 92;
const PROGRESS_OVERTIME_CEILING = 98;

export const formatGenerationElapsed = (elapsedMs: number): string => {
  const totalSec = Math.floor(elapsedMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}:${sec.toString().padStart(2, "0")} elapsed` : `${sec}s elapsed`;
};

export const getGenerationLoadingSnapshot = (
  contentMode: WorksheetContentMode,
  elapsedMs: number
): GenerationLoadingSnapshot => {
  const profile = LOADING_PROFILES[contentMode];
  const safeElapsed = Math.max(0, elapsedMs);

  let phaseIndex = profile.phases.length - 1;
  let phaseStartMs = 0;

  for (let index = 0; index < profile.phases.length; index += 1) {
    const phaseDurationMs =
      (profile.phases[index].weight / 100) * profile.estimatedTotalMs;
    if (safeElapsed < phaseStartMs + phaseDurationMs) {
      phaseIndex = index;
      break;
    }
    phaseStartMs += phaseDurationMs;
  }

  const phase = profile.phases[phaseIndex];
  const phaseDurationMs = (phase.weight / 100) * profile.estimatedTotalMs;
  const phaseElapsed = Math.max(0, safeElapsed - phaseStartMs);
  const phaseRatio = Math.min(1, phaseElapsed / Math.max(phaseDurationMs, 1));
  const priorWeight = profile.phases
    .slice(0, phaseIndex)
    .reduce((sum, entry) => sum + entry.weight, 0);

  let progress = priorWeight + phase.weight * phaseRatio;

  if (safeElapsed > profile.estimatedTotalMs) {
    const overtimeMs = safeElapsed - profile.estimatedTotalMs;
    const creep = Math.min(
      PROGRESS_OVERTIME_CEILING - PROGRESS_CAP_BEFORE_COMPLETE,
      overtimeMs / 30_000
    );
    progress = Math.min(PROGRESS_CAP_BEFORE_COMPLETE + creep, PROGRESS_OVERTIME_CEILING);
  } else {
    progress = Math.min(progress, PROGRESS_CAP_BEFORE_COMPLETE);
  }

  const isLongRunning = safeElapsed >= profile.longRunningAfterMs;
  const statusLine = isLongRunning
    ? `Still generating — complex handouts often take ${profile.typicalRangeLabel}.`
    : `Typical time for this handout: ${profile.typicalRangeLabel}`;

  return {
    progress: Math.round(Math.max(2, progress)),
    phaseTitle: phase.title,
    phaseDetail: isLongRunning
      ? `${phase.detail} This step is still running.`
      : phase.detail,
    statusLine,
    isLongRunning
  };
};
