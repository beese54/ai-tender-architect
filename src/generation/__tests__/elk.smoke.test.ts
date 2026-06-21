import { describe, expect, it } from 'vitest'
import { generateArchitecture } from '@/generation/ruleBased/architectureGenerator'
import { inferConfiguration } from '@/generation/inferConfiguration'
import { layoutDiagram } from '@/generation/elkLayout'
import type { DiagramView } from '@/generation/diagramGenerator'
import { PRESETS } from '@/constants/presets'

const arch = generateArchitecture(inferConfiguration(PRESETS.find((p) => p.id === 'rag-chatbot')!.input))

describe('diagram layout', () => {
  const views: DiagramView[] = ['conceptual', 'logical', 'data-flow', 'deployment', 'security']

  it.each(views)('positions nodes and produces edges for %s', async (view) => {
    const { nodes, edges } = await layoutDiagram(arch, view)
    expect(nodes.filter((n) => n.type === 'arch').length).toBeGreaterThan(0)
    expect(edges.length).toBeGreaterThan(0)
    // Positions are real (not all stacked at the origin).
    expect(new Set(nodes.map((n) => Math.round(n.position.y))).size).toBeGreaterThan(1)
  })

  it('data-flow uses ELK orthogonal routes (edges carry >= 2 bend points)', async () => {
    const { edges } = await layoutDiagram(arch, 'data-flow')
    for (const e of edges) {
      const pts = (e.data as { points: { x: number; y: number }[] }).points
      expect(pts.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('banded views place each partition in a single clean row', async () => {
    const { nodes } = await layoutDiagram(arch, 'logical')
    const ys = nodes.filter((n) => n.type === 'arch').map((n) => Math.round(n.position.y))
    // 12 layers in the rag-chatbot architecture → ~12 distinct, evenly-spaced rows.
    const distinct = [...new Set(ys)].sort((a, b) => a - b)
    expect(distinct.length).toBeGreaterThanOrEqual(8)
    expect(distinct.length).toBeLessThanOrEqual(12)
  })
})
