import type { Edge, Node } from 'reactflow'
import { MarkerType } from 'reactflow'
import type { GeneratedArchitecture } from '@/types/architecture'
import { buildGraph, type DiagramSpec, type DiagramView } from '@/generation/diagramGenerator'
import { buildBandedLayout } from '@/generation/bandLayout'

/**
 * Async layout for a DiagramSpec using ELK's layered algorithm with orthogonal
 * edge routing. ELK assigns node positions and routes each edge around the
 * nodes (bend points), which we render via the `routed` custom edge. `elkjs` is
 * imported dynamically so it lands in its own async chunk.
 */

interface ElkPoint {
  x: number
  y: number
}
interface ElkChild {
  id: string
  width?: number
  height?: number
  x?: number
  y?: number
  layoutOptions?: Record<string, string>
}
interface ElkSection {
  startPoint: ElkPoint
  endPoint: ElkPoint
  bendPoints?: ElkPoint[]
}
interface ElkEdgeIn {
  id: string
  sources: string[]
  targets: string[]
}
interface ElkEdgeOut {
  id: string
  sections?: ElkSection[]
}
interface ElkGraph {
  id: string
  layoutOptions?: Record<string, string>
  children: ElkChild[]
  edges: ElkEdgeIn[]
}
interface ElkResult {
  children?: ElkChild[]
  edges?: ElkEdgeOut[]
}
interface ElkInstance {
  layout(graph: ElkGraph): Promise<ElkResult>
}

let elkPromise: Promise<ElkInstance> | null = null

function getElk(): Promise<ElkInstance> {
  if (!elkPromise) {
    elkPromise = import('elkjs/lib/elk.bundled.js').then(
      (m: { default: new () => ElkInstance }) => new m.default(),
    )
  }
  return elkPromise
}

/**
 * ELK layered layout with orthogonal edge routing — used for the data-flow
 * view (a real DAG). Banded "catalog by layer" views use `buildBandedLayout`
 * instead, since ELK's flow layout fights intra-layer edges.
 */
export async function layout(spec: DiagramSpec): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const elk = await getElk()

  const graph: ElkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': spec.direction,
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '44',
      'elk.layered.spacing.nodeNodeBetweenLayers': '96',
      'elk.layered.spacing.edgeNodeBetweenLayers': '28',
    },
    children: spec.nodes.map((n) => ({ id: n.id, width: n.width, height: n.height })),
    edges: spec.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  }

  const res = await elk.layout(graph)
  const laidNodes = res.children ?? []
  const dataById = new Map(spec.nodes.map((n) => [n.id, n]))

  const nodes: Node[] = laidNodes.map((c) => ({
    id: c.id,
    type: 'arch',
    position: { x: c.x ?? 0, y: c.y ?? 0 },
    data: dataById.get(c.id)!.data,
    draggable: false,
  }))

  const laidEdgeById = new Map((res.edges ?? []).map((e) => [e.id, e]))
  const edges: Edge[] = spec.edges.map((se) => {
    const section = laidEdgeById.get(se.id)?.sections?.[0]
    const points = section
      ? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]
      : []
    return {
      id: se.id,
      source: se.source,
      target: se.target,
      type: 'routed',
      animated: se.data.animated ?? false,
      data: { ...se.data, points },
      markerEnd: { type: MarkerType.ArrowClosed, color: se.data.stroke, width: 16, height: 16 },
    }
  })

  return { nodes, edges }
}

/**
 * Build the abstract spec for a view and lay it out. Banded views use a
 * deterministic grid; the data-flow view uses async ELK orthogonal routing.
 */
export async function layoutDiagram(
  architecture: GeneratedArchitecture,
  view: DiagramView,
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const spec = buildGraph(architecture, view)
  return spec.partitioned ? buildBandedLayout(spec) : layout(spec)
}
