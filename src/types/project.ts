/**
 * Structured user inputs for a tender / architecture generation request.
 * This is the single source of truth the generation engine consumes.
 */

export type ProjectStage = 'poc' | 'pilot' | 'production' | 'enterprise'

export type DeploymentPreference =
  | 'cloud'
  | 'on-premises'
  | 'hybrid'
  | 'air-gapped'
  | 'not-specified'

export type DataSensitivity = 'low' | 'medium' | 'high' | 'restricted' | 'not-specified'

export type DataCadence = 'batch' | 'real-time' | 'both' | 'not-specified'

export type TenderTone = 'formal' | 'concise' | 'detailed' | 'technical' | 'procurement-ready'

export type TenderLength = 'short' | 'medium' | 'detailed'

/** Data-size unit for the document corpus (entire knowledge base). */
export type CorpusUnit = 'KB' | 'MB' | 'GB' | 'TB'

export interface PerformanceRequirements {
  concurrentUsers?: string
  dailyQueryVolume?: string
  /** Total size of the entire knowledge base / corpus (paired with documentCorpusUnit). */
  documentCorpusSize?: string
  documentCorpusUnit?: CorpusUnit
  averagePromptSize?: string
  outputSize?: string
  latencyTarget?: string
  throughputTarget?: string
  availabilityTarget?: string
  rto?: string
  rpo?: string
}

export interface TenderPreferences {
  tone: TenderTone
  length: TenderLength
  includeMandatory: boolean
  includeOptional: boolean
  includeEvaluationCriteria: boolean
  includeAcceptanceTests: boolean
  includeDeliverables: boolean
  includeMilestones: boolean
  includeServiceLevels: boolean
  includeSecurityRequirements: boolean
  includeSupportRequirements: boolean
  includeLockInClauses: boolean
  includeReferenceExamples: boolean
  /** Include the AI task-delegation plan + deterministic-safeguard clauses. */
  includeDelegationPlan: boolean
}

export interface ProjectInput {
  // A. Project details
  projectTitle: string
  organisation: string
  background: string
  problemStatement: string
  intendedUsers: string[]
  userPainPoints: string
  businessOutcomes: string[]
  projectStage: ProjectStage
  timeline: string
  expectedUsers: string
  departmentsInvolved: string

  // B. Use cases
  useCases: string[]
  customUseCase?: string

  // C. Data and knowledge sources
  dataSources: string[]
  dataTypes: string[]
  dataCadence: DataCadence
  deploymentPreference: DeploymentPreference
  dataSensitivity: DataSensitivity

  // D. AI capabilities
  aiCapabilities: string[]

  // E. Model and serving strategy
  modelStrategy: string[]

  // F. Architecture priorities
  architecturePriorities: string[]

  // G. Security, governance, compliance
  securityRequirements: string[]

  // H. Performance and reliability
  performanceRequirements: PerformanceRequirements

  // I. Tender output preferences
  tenderPreferences: TenderPreferences
}
