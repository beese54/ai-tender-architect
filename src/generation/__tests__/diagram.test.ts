import { describe, expect, it } from 'vitest'
import { generateArchitecture } from '@/generation/ruleBased/architectureGenerator'
import { inferConfiguration } from '@/generation/inferConfiguration'
import { buildGraph, type DiagramView } from '@/generation/diagramGenerator'
import { PRESETS } from '@/constants/presets'

// Mirror the store: infer the technical config, then generate the architecture.
const arch = generateArchitecture(inferConfiguration(PRESETS.find((p) => p.id === 'rag-chatbot')!.input))

describe('buildGraph', () => {
  const views: DiagramView[] = ['conceptual', 'logical', 'data-flow', 'deployment', 'security']

  it.each(views)('produces non-empty nodes and edges for the %s view', (view) => {
    const spec = buildGraph(arch, view)
    expect(spec.nodes.length).toBeGreaterThan(0)
    expect(spec.edges.length).toBeGreaterThan(0)
  })

  it('partitions and orients each view correctly', () => {
    expect(buildGraph(arch, 'logical')).toMatchObject({ direction: 'DOWN', partitioned: true })
    expect(buildGraph(arch, 'data-flow')).toMatchObject({ direction: 'RIGHT', partitioned: false })
    expect(buildGraph(arch, 'deployment')).toMatchObject({ direction: 'DOWN', partitioned: true })
  })

  it('logical assigns a partition (band) to every node', () => {
    const spec = buildGraph(arch, 'logical')
    for (const n of spec.nodes) expect(typeof n.partition).toBe('number')
  })

  it('data-flow only includes nodes that have at least one edge', () => {
    const spec = buildGraph(arch, 'data-flow')
    const incident = new Set<string>()
    for (const e of spec.edges) {
      incident.add(e.source)
      incident.add(e.target)
    }
    for (const n of spec.nodes) expect(incident.has(n.id)).toBe(true)
  })

  it('deployment groups every architecture node under a captioned band', () => {
    const spec = buildGraph(arch, 'deployment')
    expect(spec.bands.length).toBeGreaterThan(0)
    expect(spec.nodes.map((n) => n.id).sort()).toEqual(arch.nodes.map((n) => n.id).sort())
  })

  it('security dims non-security controls and keeps security controls emphasised', () => {
    const spec = buildGraph(arch, 'security')
    expect(spec.bands.length).toBeGreaterThan(0)
    const securityIds = new Set(
      arch.nodes.filter((n) => n.group.startsWith('Security')).map((n) => n.id),
    )
    for (const n of spec.nodes) {
      if (securityIds.has(n.id)) expect(n.data.dimmed).toBeFalsy()
      else expect(n.data.dimmed).toBe(true)
    }
  })
})
