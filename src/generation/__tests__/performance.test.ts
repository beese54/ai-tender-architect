import { describe, expect, it } from 'vitest'
import { deriveTargets } from '@/generation/derivePerformanceTargets'
import { inferConfiguration } from '@/generation/inferConfiguration'
import { createEmptyProject } from '@/constants/presets'

/** Pull the numeric req/s out of "≥ 10 requests/second at peak". */
function qps(s: string): number {
  return Number.parseFloat(s.replace(/[^0-9.]/g, ''))
}
/** Pull the p95 seconds out of "p95 end-to-end ≤ 3s (time-to-first-token ≤ 1s)". */
function p95(s: string): number {
  const m = s.match(/≤\s*([\d.]+)\s*s/) // first "≤ Ns" is the p95 figure
  return m ? Number.parseFloat(m[1]) : Number.NaN
}

describe('deriveTargets — throughput', () => {
  it('scales with concurrency and includes the 50% buffer', () => {
    // 200 concurrent -> 200/30 = 6.67 qps -> x1.5 = 10.005 -> ceil 10/s
    const t = deriveTargets({ concurrentUsers: '200', dailyQueryVolume: '10,000' }, 'production')
    expect(qps(t.throughputTarget)).toBeGreaterThanOrEqual(10)
  })

  it('grows when daily volume dominates', () => {
    const small = deriveTargets({ dailyQueryVolume: '10,000' }, 'production')
    const big = deriveTargets({ dailyQueryVolume: '1,000,000' }, 'production')
    expect(qps(big.throughputTarget)).toBeGreaterThan(qps(small.throughputTarget))
  })

  it('falls back to a sensible baseline with no inputs', () => {
    const t = deriveTargets({}, 'pilot')
    expect(qps(t.throughputTarget)).toBeGreaterThanOrEqual(5)
  })
})

describe('deriveTargets — latency', () => {
  it('tightens for small scale and relaxes for large scale', () => {
    const small = deriveTargets({ concurrentUsers: '20' }, 'production')
    const large = deriveTargets({ concurrentUsers: '5000' }, 'production')
    expect(p95(small.latencyTarget)).toBeLessThan(p95(large.latencyTarget))
  })

  it('adds latency headroom for a very large corpus', () => {
    const normal = deriveTargets({ concurrentUsers: '200', documentCorpusSize: '100', documentCorpusUnit: 'GB' }, 'production')
    const huge = deriveTargets({ concurrentUsers: '200', documentCorpusSize: '2', documentCorpusUnit: 'TB' }, 'production')
    expect(p95(huge.latencyTarget)).toBeGreaterThan(p95(normal.latencyTarget))
  })
})

describe('deriveTargets — availability', () => {
  it('steps up by project stage', () => {
    expect(deriveTargets({}, 'poc').availabilityTarget).toBe('99.0%')
    expect(deriveTargets({}, 'pilot').availabilityTarget).toBe('99.5%')
    expect(deriveTargets({}, 'production').availabilityTarget).toBe('99.9%')
    expect(deriveTargets({}, 'enterprise').availabilityTarget).toBe('99.95%')
  })

  it('bumps a production system to 99.95% under large load', () => {
    const t = deriveTargets({ concurrentUsers: '2000' }, 'production')
    expect(t.availabilityTarget).toBe('99.95%')
  })
})

describe('inferConfiguration — performance & tender output', () => {
  it('fills the three performance targets and forces procurement-ready/detailed', () => {
    const input = createEmptyProject()
    input.projectStage = 'production'
    input.performanceRequirements = { concurrentUsers: '300' }
    input.tenderPreferences.tone = 'concise'
    input.tenderPreferences.length = 'short'

    const derived = inferConfiguration(input)
    expect(derived.performanceRequirements.latencyTarget).toBeTruthy()
    expect(derived.performanceRequirements.availabilityTarget).toBeTruthy()
    expect(derived.performanceRequirements.throughputTarget).toBeTruthy()
    expect(derived.tenderPreferences.tone).toBe('procurement-ready')
    expect(derived.tenderPreferences.length).toBe('detailed')
    // User-supplied scale inputs are preserved.
    expect(derived.performanceRequirements.concurrentUsers).toBe('300')
  })
})
