import type { GenerationProvider } from '@/generation/types'
import { generateArchitecture as ruleArchitecture, generateTender as ruleTender } from '@/generation/ruleBased'
import { chatJson, parseJsonObject, isAzureConfigured } from './azureClient'
import {
  buildArchitectureNarrativePrompt,
  buildTenderProsePrompt,
  parseArchitectureNarrative,
  mergeTenderProse,
} from './prompts'

export { isAzureConfigured }

/**
 * Azure OpenAI generation provider (hybrid).
 *
 * The diagram STRUCTURE (nodes/edges) is always produced by the deterministic
 * rule-based engine so it always conforms to the 12-layer catalog and never
 * breaks the layout. The LLM only authors the narrative prose:
 *   - architecture `assumptions` + `risks`
 *   - tender section intros + clause text (structure/ids/levels preserved)
 * Any failure falls back transparently to the rule-based scaffold.
 */
export const azureLlmProvider: GenerationProvider = {
  id: 'azure',
  label: 'Azure OpenAI (AI-assisted)',

  generateArchitecture: async (input) => {
    const scaffold = ruleArchitecture(input)
    try {
      const raw = await chatJson(buildArchitectureNarrativePrompt(input, scaffold), { temperature: 0.4 })
      const narrative = parseArchitectureNarrative(parseJsonObject(raw))
      if (!narrative) return scaffold
      return { ...scaffold, assumptions: narrative.assumptions, risks: narrative.risks }
    } catch (err) {
      console.warn('[azure] architecture narrative generation failed; using rule-based scaffold.', err)
      return scaffold
    }
  },

  generateTender: async (input, architecture) => {
    const scaffold = ruleTender(input, architecture)
    try {
      const raw = await chatJson(buildTenderProsePrompt(input, scaffold), { temperature: 0.4 })
      const merged = mergeTenderProse(scaffold, parseJsonObject(raw))
      return merged ?? scaffold
    } catch (err) {
      console.warn('[azure] tender prose generation failed; using rule-based scaffold.', err)
      return scaffold
    }
  },
}
