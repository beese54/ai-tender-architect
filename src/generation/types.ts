import type { ProjectInput } from '@/types/project'
import type { GeneratedArchitecture } from '@/types/architecture'
import type { GeneratedTender } from '@/types/tender'

/**
 * Provider-agnostic generation contract. The UI depends only on this interface,
 * so a future LLM-backed implementation can be dropped in without UI changes.
 */
export interface GenerationProvider {
  id: string
  label: string
  generateArchitecture(input: ProjectInput): Promise<GeneratedArchitecture>
  generateTender(input: ProjectInput, architecture: GeneratedArchitecture): Promise<GeneratedTender>
}
