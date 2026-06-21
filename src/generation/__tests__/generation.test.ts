import { describe, expect, it } from 'vitest'
import { generateArchitecture } from '@/generation/ruleBased/architectureGenerator'
import { generateTender } from '@/generation/ruleBased/tenderSpecGenerator'
import { checkVendorNeutrality } from '@/generation/vendorNeutralityChecker'
import { inferConfiguration } from '@/generation/inferConfiguration'
import { createEmptyProject, PRESETS } from '@/constants/presets'
import type { ProjectInput } from '@/types/project'

const ragChatbot = PRESETS.find((p) => p.id === 'rag-chatbot')!.input
const selfHosted = PRESETS.find((p) => p.id === 'self-hosted-serving')!.input

describe('architectureGenerator', () => {
  it('includes a model gateway when vendor agnosticism is selected', () => {
    const arch = generateArchitecture(ragChatbot)
    expect(arch.nodes.some((n) => n.id === 'model-gateway')).toBe(true)
  })

  it('includes the core RAG nodes for a RAG chatbot', () => {
    const arch = generateArchitecture(ragChatbot)
    const ids = new Set(arch.nodes.map((n) => n.id))
    for (const id of ['embedding-generation', 'hybrid-retrieval', 'vector-store', 'citation-grounding']) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it('separates components across multiple distinct layers', () => {
    const arch = generateArchitecture(ragChatbot)
    const groups = new Set(arch.nodes.map((n) => n.group))
    expect(groups.size).toBeGreaterThanOrEqual(8)
  })

  it('adds self-hosted serving and compute for a self-hosted strategy', () => {
    const arch = generateArchitecture(selfHosted)
    const ids = new Set(arch.nodes.map((n) => n.id))
    expect(ids.has('self-hosted-model-endpoint')).toBe(true)
    expect(ids.has('gpu-inference')).toBe(true)
    expect(ids.has('compute-cluster')).toBe(true)
  })
})

describe('vendorNeutralityChecker', () => {
  it('produces no warnings for a vendor-neutral tender (reference examples off)', () => {
    const arch = generateArchitecture(ragChatbot)
    const tender = generateTender(ragChatbot, arch)
    expect(checkVendorNeutrality(tender)).toHaveLength(0)
  })

  it('does not flag vendor terms inside the labelled reference-examples section', () => {
    const input: ProjectInput = {
      ...ragChatbot,
      tenderPreferences: { ...ragChatbot.tenderPreferences, includeReferenceExamples: true },
    }
    const arch = generateArchitecture(input)
    const tender = generateTender(input, arch)
    // The examples section names vendors, but it is exempt — still zero warnings.
    expect(checkVendorNeutrality(tender)).toHaveLength(0)
    expect(tender.sections.some((s) => s.isReferenceExamples)).toBe(true)
  })

  it('flags a vendor term forced into a mandatory clause', () => {
    const arch = generateArchitecture(ragChatbot)
    const tender = generateTender(ragChatbot, arch)
    tender.sections[0].clauses.push({ id: 'x', level: 'shall', text: 'The Contractor shall use NVIDIA hardware.' })
    const warnings = checkVendorNeutrality(tender)
    expect(warnings.some((w) => w.term === 'NVIDIA')).toBe(true)
  })
})

describe('inferConfiguration', () => {
  it('fills empty config arrays from a minimal intake', () => {
    const input = createEmptyProject()
    input.useCases = ['RAG chatbot']
    input.dataTypes = ['PDFs']
    input.dataSensitivity = 'high'
    const derived = inferConfiguration(input)

    expect(derived.aiCapabilities).toContain('Retrieval-augmented generation')
    expect(derived.modelStrategy).toContain('Model gateway required')
    expect(derived.modelStrategy).toContain('Need to avoid vendor lock-in')
    expect(derived.architecturePriorities).toContain('Vendor agnostic')
    expect(derived.securityRequirements).toContain('Role-based access control')
    // High sensitivity should pull in stronger controls.
    expect(derived.securityRequirements).toContain('Sensitive data handling')
  })

  it('preserves explicitly provided config (presets pass through unchanged)', () => {
    const preset = PRESETS.find((p) => p.id === 'rag-chatbot')!.input
    const derived = inferConfiguration(preset)
    expect(derived.aiCapabilities).toEqual(preset.aiCapabilities)
    expect(derived.modelStrategy).toEqual(preset.modelStrategy)
    expect(derived.architecturePriorities).toEqual(preset.architecturePriorities)
  })

  it('produces a gateway + RAG architecture and a neutral tender end-to-end from a minimal intake', () => {
    const input = createEmptyProject()
    input.useCases = ['RAG chatbot']
    input.dataTypes = ['PDFs']
    const derived = inferConfiguration(input)
    const arch = generateArchitecture(derived)
    const tender = generateTender(derived, arch)
    expect(arch.nodes.some((n) => n.id === 'model-gateway')).toBe(true)
    expect(arch.nodes.some((n) => n.id === 'vector-store')).toBe(true)
    expect(checkVendorNeutrality(tender)).toHaveLength(0)
  })
})

describe('tender preferences gating', () => {
  it('omits acceptance tests and evaluation criteria sections when disabled', () => {
    const input = createEmptyProject()
    input.tenderPreferences.includeAcceptanceTests = false
    input.tenderPreferences.includeEvaluationCriteria = false
    const arch = generateArchitecture(input)
    const tender = generateTender(input, arch)
    expect(tender.sections.some((s) => s.heading.includes('Acceptance'))).toBe(false)
    expect(tender.sections.some((s) => s.heading.includes('Evaluation Criteria'))).toBe(false)
  })

  it('includes acceptance tests when enabled', () => {
    const arch = generateArchitecture(ragChatbot)
    const tender = generateTender(ragChatbot, arch)
    expect(tender.sections.some((s) => s.heading.includes('Acceptance'))).toBe(true)
    expect(tender.acceptanceTests.length).toBeGreaterThan(0)
  })
})
