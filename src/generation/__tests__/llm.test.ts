import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseJsonObject, isAzureConfigured } from '@/generation/llm/azureClient'
import {
  parseArchitectureNarrative,
  mergeTenderProse,
} from '@/generation/llm/prompts'
import { azureLlmProvider } from '@/generation/llm'
import { generateTender } from '@/generation/ruleBased/tenderSpecGenerator'
import { generateArchitecture } from '@/generation/ruleBased/architectureGenerator'
import { inferConfiguration } from '@/generation/inferConfiguration'
import { PRESETS } from '@/constants/presets'

const input = inferConfiguration(PRESETS.find((p) => p.id === 'rag-chatbot')!.input)

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('parseJsonObject', () => {
  it('parses plain JSON', () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 })
  })
  it('strips a ```json code fence', () => {
    expect(parseJsonObject('```json\n{"a":2}\n```')).toEqual({ a: 2 })
  })
  it('recovers the outermost object from surrounding prose', () => {
    expect(parseJsonObject('Here you go: {"a":3} thanks')).toEqual({ a: 3 })
  })
  it('throws on unparseable input', () => {
    expect(() => parseJsonObject('not json at all')).toThrow()
  })
})

describe('isAzureConfigured', () => {
  it('is false when the deployment is not set', () => {
    // Stub empty so the result is independent of any real .env.local on disk.
    vi.stubEnv('VITE_AZURE_OPENAI_DEPLOYMENT', '')
    expect(isAzureConfigured()).toBe(false)
  })
  it('is true when the deployment is set', () => {
    vi.stubEnv('VITE_AZURE_OPENAI_DEPLOYMENT', 'gpt-4o')
    expect(isAzureConfigured()).toBe(true)
  })
})

describe('parseArchitectureNarrative', () => {
  it('accepts well-formed string arrays', () => {
    expect(parseArchitectureNarrative({ assumptions: ['a'], risks: ['r'] })).toEqual({
      assumptions: ['a'],
      risks: ['r'],
    })
  })
  it('rejects empty or malformed payloads', () => {
    expect(parseArchitectureNarrative({ assumptions: [], risks: ['r'] })).toBeNull()
    expect(parseArchitectureNarrative({ assumptions: 'nope' })).toBeNull()
    expect(parseArchitectureNarrative(null)).toBeNull()
  })
})

describe('mergeTenderProse', () => {
  const scaffold = generateTender(input, generateArchitecture(input))

  it('preserves structure while swapping in improved text', () => {
    const first = scaffold.sections[0]
    const data = {
      sections: [
        {
          heading: first.heading,
          intro: 'Refined intro.',
          clauses: first.clauses.map((c) => ({ id: c.id, text: 'Refined ' + c.text })),
        },
      ],
    }
    const merged = mergeTenderProse(scaffold, data)!
    expect(merged).not.toBeNull()
    // Same number/order of sections and clauses, same ids + levels.
    expect(merged.sections.length).toBe(scaffold.sections.length)
    expect(merged.sections[0].intro).toBe('Refined intro.')
    expect(merged.sections[0].clauses.map((c) => c.id)).toEqual(first.clauses.map((c) => c.id))
    expect(merged.sections[0].clauses.map((c) => c.level)).toEqual(first.clauses.map((c) => c.level))
    expect(merged.sections[0].clauses[0].text.startsWith('Refined ')).toBe(true)
  })

  it('falls back to scaffold values for omitted sections/clauses', () => {
    const merged = mergeTenderProse(scaffold, { sections: [] })!
    expect(merged.sections).toEqual(scaffold.sections)
    expect(merged.evaluationCriteria).toEqual(scaffold.evaluationCriteria)
  })

  it('returns null when sections is not an array', () => {
    expect(mergeTenderProse(scaffold, { sections: 'oops' })).toBeNull()
  })

  it('carries the deterministic delegation plan through unchanged', () => {
    expect(scaffold.delegationPlan).toBeDefined()
    const merged = mergeTenderProse(scaffold, { sections: [] })!
    expect(merged.delegationPlan).toEqual(scaffold.delegationPlan)
  })
})

describe('azureLlmProvider fallback', () => {
  it('returns the rule-based scaffold when Azure is not configured', async () => {
    // Force "not configured" so chatJson throws immediately (no network call)
    // and the provider falls back to the deterministic scaffold.
    vi.stubEnv('VITE_AZURE_OPENAI_DEPLOYMENT', '')
    const arch = await azureLlmProvider.generateArchitecture(input)
    const ruleArch = generateArchitecture(input)
    expect(arch.nodes.map((n) => n.id)).toEqual(ruleArch.nodes.map((n) => n.id))
    expect(arch.assumptions).toEqual(ruleArch.assumptions)

    const tender = await azureLlmProvider.generateTender(input, arch)
    expect(tender.sections.length).toBe(generateTender(input, ruleArch).sections.length)
  })
})
