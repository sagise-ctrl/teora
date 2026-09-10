/**
 * Status mapping layer — translate backend technical status to user-facing stages.
 *
 * DECISION 010 (2026-09-02): backend keeps 6 technical statuses (state machine),
 * frontend displays 4 user-facing stages (Idea/Writing/Revision/Done).
 *
 * Do NOT modify backend status enum. Add cases here if backend adds new statuses.
 */

export type UserStage = "idea" | "plan" | "writing" | "revision" | "done";

export type BackendStatus =
  | "draft"
  | "analyzing"
  | "writing"
  | "waiting_revision"
  | "completed"
  | "archived";

const BACKEND_TO_STAGE: Record<BackendStatus, UserStage> = {
  draft: "idea",
  analyzing: "writing",
  writing: "writing",
  waiting_revision: "revision",
  completed: "done",
  archived: "done",
};

export function backendStatusToStage(status: string): UserStage {
  return (BACKEND_TO_STAGE as Record<string, UserStage>)[status] ?? "idea";
}

export interface StageMeta {
  label: string;
  color: string; // Tailwind classes for badge
  textColor: string;
}

const STAGE_META: Record<UserStage, StageMeta> = {
  idea: {
    label: "Idea",
    color: "bg-slate-100 dark:bg-slate-800",
    textColor: "text-slate-700 dark:text-slate-300",
  },
  plan: {
    label: "Plan",
    color: "bg-indigo-100 dark:bg-indigo-900/30",
    textColor: "text-indigo-700 dark:text-indigo-400",
  },
  writing: {
    label: "Writing",
    color: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-400",
  },
  revision: {
    label: "Revision",
    color: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-400",
  },
  done: {
    label: "Done",
    color: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-400",
  },
};

export function stageMeta(stage: UserStage): StageMeta {
  return STAGE_META[stage];
}

/**
 * Get all stages for a project type.
 * General Task = 4 stages, Academic Work = 5 stages (Plan only applies to academic).
 */
export type TaskType = "general" | "academic";

export const GENERAL_STAGES: UserStage[] = ["idea", "writing", "revision", "done"];
export const ACADEMIC_STAGES: UserStage[] = ["idea", "plan", "writing", "revision", "done"];
// Note: "plan" is rendered separately for academic — see ACADEMIC_PLAN_STAGE below.

export interface DisplayStage extends StageMeta {
  key: string;
}

export function displayStagesFor(type: TaskType | null | undefined): DisplayStage[] {
  if (type === "academic") {
    return ACADEMIC_STAGES.map((s) => ({ key: s, ...stageMeta(s as UserStage) }));
  }
  return GENERAL_STAGES.map((s) => ({ key: s, ...stageMeta(s) }));
}

/**
 * Map project status to a displayable stage key for filtering.
 * Used to count tasks per stage chip.
 */
export function statusToStageKey(status: string, type: TaskType | null | undefined): string {
  const stage = backendStatusToStage(status);
  return stage;
}

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  general: "Task Umum",
  academic: "Academic Work",
};

export const TASK_TYPE_LABEL_EN: Record<TaskType, string> = {
  general: "General Task",
  academic: "Academic Work",
};
