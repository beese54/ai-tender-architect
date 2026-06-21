/**
 * AI task-delegation model — the structured output of applying
 * `AI_DELEGATION_FRAMEWORK.md` to a project. Each AI use case is decomposed into
 * subtasks and each subtask is routed to the tool that should own it.
 */

/** Who should own a subtask. */
export type DelegationOwner = 'deterministic' | 'model' | 'hybrid'

export interface DelegationSubtask {
  id: string
  /** The concrete subtask, phrased tool-agnostically. */
  task: string
  owner: DelegationOwner
  /** One-line reason tied to the framework's decision axis (§1–§3). */
  reason: string
  /**
   * For `model` / `hybrid` subtasks: the deterministic, ground-truth facts the
   * model should be fed as labelled evidence (so it doesn't re-guess them).
   */
  evidence?: string[]
  /** Deterministic checks applied to the model's output. */
  postChecks?: string[]
  /**
   * What happens when the model is wrong or unavailable, and how the downgrade
   * is surfaced. Required for every `model` / `hybrid` subtask (the framework's
   * "make degradation loud, never silent").
   */
  fallback?: string
}

/** A place the project is about to mis-apply a model, with the deterministic remedy. */
export interface DelegationAntiPattern {
  risk: string
  remedy: string
}

export interface DelegationPlan {
  /** One-paragraph framing of how the work is split. */
  summary: string
  subtasks: DelegationSubtask[]
  antiPatterns: DelegationAntiPattern[]
}
