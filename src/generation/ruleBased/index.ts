import type { GenerationProvider } from '@/generation/types'
import { generateArchitecture } from './architectureGenerator'
import { generateTender } from './tenderSpecGenerator'

/** The default, fully-deterministic generation provider. */
export const ruleBasedProvider: GenerationProvider = {
  id: 'rule-based',
  label: 'Rule-based (deterministic)',
  // The underlying generators are synchronous; wrap them to satisfy the
  // async GenerationProvider contract (shared with the LLM provider).
  generateArchitecture: async (input) => generateArchitecture(input),
  generateTender: async (input, architecture) => generateTender(input, architecture),
}

// Re-export the raw synchronous generators so other providers (e.g. the LLM
// provider) can reuse them as a deterministic scaffold / fallback.
export { generateArchitecture, generateTender }
