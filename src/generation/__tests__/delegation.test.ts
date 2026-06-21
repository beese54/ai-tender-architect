import { describe, expect, it } from 'vitest'
import { generateDelegationPlan } from '@/generation/ruleBased/delegationPlanGenerator'
import { generateArchitecture } from '@/generation/ruleBased/architectureGenerator'
import { generateTender } from '@/generation/ruleBased/tenderSpecGenerator'
import { checkVendorNeutrality } from '@/generation/vendorNeutralityChecker'
import { inferConfiguration } from '@/generation/inferConfiguration'
import { createEmptyProject } from '@/constants/presets'
import type { ProjectInput } from '@/types/project'

/** A fictitious industrial operations copilot: sensor data + predictive maintenance + compliance. */
function industrialInput(): ProjectInput {
  return inferConfiguration({
    ...createEmptyProject(),
    projectTitle: 'Industrial Operations Copilot',
    useCases: ['Industrial copilot', 'Predictive maintenance', 'Decision support system'],
    dataSources: ['Sensor data', 'Real-time telemetry', 'Unstructured documents'],
    dataTypes: ['Sensor / time-series', 'Structured records', 'PDFs'],
    dataCadence: 'both',
    dataSensitivity: 'high',
    securityRequirements: ['Compliance requirements', 'Audit logging', 'Human approval workflow'],
  })
}

describe('generateDelegationPlan', () => {
  const plan = generateDelegationPlan(industrialInput())

  it('routes transcription and threshold subtasks to deterministic components', () => {
    const det = plan.subtasks.filter((s) => s.owner === 'deterministic')
    expect(det.some((s) => /exact values|readings/i.test(s.task))).toBe(true)
    expect(det.some((s) => /threshold|limit|alarm/i.test(s.task))).toBe(true)
  })

  it('routes synthesis/recommendation to the model', () => {
    expect(
      plan.subtasks.some(
        (s) => s.owner === 'model' && /recommend|explanation|answer/i.test(s.task),
      ),
    ).toBe(true)
  })

  it('gives every model/hybrid subtask a loud fallback (no silent degradation)', () => {
    for (const s of plan.subtasks) {
      if (s.owner !== 'deterministic') {
        expect(s.fallback && s.fallback.trim().length > 0).toBeTruthy()
      }
    }
  })

  it('flags the sensor-value and compliance anti-patterns', () => {
    const risks = plan.antiPatterns.map((a) => a.risk.toLowerCase())
    expect(risks.some((r) => r.includes('sensor') || r.includes('exact values'))).toBe(true)
    expect(risks.some((r) => r.includes('compliance') || r.includes('audit'))).toBe(true)
    // The "don't wrap the whole pipeline in one call" guard is always present.
    expect(risks.some((r) => r.includes('single model call'))).toBe(true)
  })

  it('is fully deterministic — same input yields an identical plan', () => {
    const a = generateDelegationPlan(industrialInput())
    const b = generateDelegationPlan(industrialInput())
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('delegation plan in the tender', () => {
  it('adds the safeguard clause section and attaches the plan when enabled', () => {
    const input = industrialInput()
    const tender = generateTender(input, generateArchitecture(input))
    expect(tender.sections.some((s) => s.heading.includes('Delegation'))).toBe(true)
    expect(tender.delegationPlan).toBeDefined()
    expect(tender.delegationPlan!.subtasks.length).toBeGreaterThan(0)
  })

  it('omits both the section and the plan when disabled', () => {
    const input = industrialInput()
    input.tenderPreferences.includeDelegationPlan = false
    const tender = generateTender(input, generateArchitecture(input))
    expect(tender.sections.some((s) => s.heading.includes('Delegation'))).toBe(false)
    expect(tender.delegationPlan).toBeUndefined()
  })

  it('introduces no vendor-neutrality warnings', () => {
    const input = industrialInput()
    const tender = generateTender(input, generateArchitecture(input))
    expect(checkVendorNeutrality(tender)).toHaveLength(0)
  })
})
