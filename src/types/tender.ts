/** Generated tender specification model. */

import type { DelegationPlan } from './delegation'

export type ClauseLevel = 'shall' | 'should'

export interface TenderClause {
  id: string
  level: ClauseLevel
  text: string
}

export interface TenderSection {
  heading: string
  intro?: string
  clauses: TenderClause[]
  /**
   * When true, this section holds clearly-labelled non-mandatory reference
   * examples. The vendor-neutrality checker ignores vendor terms inside it.
   */
  isReferenceExamples?: boolean
}

export interface GeneratedTender {
  title: string
  sections: TenderSection[]
  evaluationCriteria: string[]
  acceptanceTests: string[]
  deliverables: string[]
  /**
   * Structured AI task-delegation plan (deterministic vs model vs hybrid routing).
   * Present when the `includeDelegationPlan` tender preference is enabled.
   */
  delegationPlan?: DelegationPlan
}

/** A single vendor-neutrality warning surfaced to the user. */
export interface NeutralityWarning {
  term: string
  sectionHeading: string
  clauseText: string
}
