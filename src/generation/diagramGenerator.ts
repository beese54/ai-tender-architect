import type { ArchitectureNode, ArchitectureViewType, GeneratedArchitecture } from '@/types/architecture'
import { LAYERS, accentForGroup, orderForGroup, type LayerId } from '@/constants/layers'

export interface ArchNodeData {
  label: string
  group: string
  description: string
  accent: string
  required: boolean
  /** Conceptual view only: number of detailed nodes in this layer. */
  count?: number
  /** Security view (or hover): de-emphasise nodes that are not the focus. */
  dimmed?: boolean
}

/** Data for a band/zone caption node (deployment & security views). */
export interface GroupLabelData {
  label: string
  accent: string
}

/** All five diagram views share the generated architecture's node/edge model. */
export type DiagramView = ArchitectureViewType

/* ----------------------------------------------------------- Abstract spec */
// `buildGraph` is pure and synchronous: it decides which nodes/edges a view
// contains, how they are grouped into bands, and how edges are styled — but it
// does NOT assign positions. ELK (`elkLayout.ts`) consumes this spec to compute
// node positions and orthogonal edge routes. Keeping the two stages separate
// makes the view logic easy to unit-test without pulling in the async layout.

export interface SpecNode {
  id: string
  data: ArchNodeData
  width: number
  height: number
  /** Band index used for ELK layer partitioning (preserves the lane order). */
  partition?: number
}

export interface SpecEdge {
  id: string
  source: string
  target: string
  data: {
    label?: string
    stroke: string
    strokeWidth?: number
    animated?: boolean
    /** Statically de-emphasised (security view's non-control edges). */
    dimmed?: boolean
  }
}

/** A captioned band/zone, placed at the left margin after layout. */
export interface SpecBand {
  partition: number
  caption: string
  accent: string
}

export interface DiagramSpec {
  nodes: SpecNode[]
  edges: SpecEdge[]
  bands: SpecBand[]
  direction: 'DOWN' | 'RIGHT'
  partitioned: boolean
}

export const NODE_WIDTH = 230
export const NODE_HEIGHT = 86

/** Build the abstract, unpositioned graph spec for a view. */
export function buildGraph(architecture: GeneratedArchitecture, view: DiagramView): DiagramSpec {
  switch (view) {
    case 'conceptual':
      return buildConceptual(architecture)
    case 'data-flow':
      return buildDataFlow(architecture)
    case 'deployment':
      return buildDeployment(architecture)
    case 'security':
      return buildSecurity(architecture)
    case 'logical':
    default:
      return buildLogical(architecture)
  }
}

const SPINE_STROKE = '#94a3b8'
const FLOW_STROKE = '#6366f1'
const DEPLOY_STROKE = '#cbd5e1'
const CONTROL_STROKE = '#ef4444'
const MUTED_STROKE = '#e2e8f0'

/** Map a node's `group` (layer label) back to its catalog LayerId. */
const layerIdByLabel = new Map<string, LayerId>(LAYERS.map((l) => [l.label, l.id]))

function archData(n: ArchitectureNode, dimmed?: boolean): ArchNodeData {
  return {
    label: n.label,
    group: n.group,
    description: n.description,
    accent: accentForGroup(n.group),
    required: n.required,
    ...(dimmed ? { dimmed: true } : {}),
  }
}

function specNode(n: ArchitectureNode, partition: number | undefined, dimmed?: boolean): SpecNode {
  return { id: n.id, data: archData(n, dimmed), width: NODE_WIDTH, height: NODE_HEIGHT, partition }
}

/** Order nodes within a mixed-layer band by their catalog layer order. */
function byLayerOrder(a: ArchitectureNode, b: ArchitectureNode): number {
  return orderForGroup(a.group) - orderForGroup(b.group)
}

// --- Logical view ----------------------------------------------------------
function buildLogical(arch: GeneratedArchitecture): DiagramSpec {
  // Each present layer becomes one partition (band), top → bottom by lane order.
  const presentOrders = [...new Set(arch.nodes.map((n) => orderForGroup(n.group)))].sort((a, b) => a - b)
  const partitionOf = new Map(presentOrders.map((o, i) => [o, i]))

  const nodes = arch.nodes.map((n) => specNode(n, partitionOf.get(orderForGroup(n.group))))
  const edges: SpecEdge[] = arch.edges.map((e, i) => ({
    id: `e${i}-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    data: { label: e.label, stroke: SPINE_STROKE, animated: true },
  }))

  return { nodes, edges, bands: [], direction: 'DOWN', partitioned: true }
}

// --- Conceptual view -------------------------------------------------------
function buildConceptual(arch: GeneratedArchitecture): DiagramSpec {
  // One node per present layer, stacked vertically (one node per partition).
  const presentGroups = LAYERS.filter((l) => arch.nodes.some((n) => n.group === l.label))

  const nodes: SpecNode[] = presentGroups.map((layer, i) => {
    const count = arch.nodes.filter((n) => n.group === layer.label).length
    return {
      id: `layer-${layer.id}`,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      partition: i,
      data: {
        label: layer.label,
        group: layer.label,
        description: `${count} component${count === 1 ? '' : 's'}`,
        accent: layer.accent,
        required: true,
        count,
      },
    }
  })

  // Aggregate detailed edges into layer-to-layer edges.
  const groupOf = new Map(arch.nodes.map((n) => [n.id, n.group]))
  const seen = new Set<string>()
  const edges: SpecEdge[] = []
  for (const e of arch.edges) {
    const sg = groupOf.get(e.source)
    const tg = groupOf.get(e.target)
    if (!sg || !tg || sg === tg) continue
    const sLayer = LAYERS.find((l) => l.label === sg)
    const tLayer = LAYERS.find((l) => l.label === tg)
    if (!sLayer || !tLayer) continue
    const key = `${sLayer.id}->${tLayer.id}`
    if (seen.has(key)) continue
    seen.add(key)
    edges.push({
      id: `ce-${key}`,
      source: `layer-${sLayer.id}`,
      target: `layer-${tLayer.id}`,
      data: { stroke: SPINE_STROKE, animated: true },
    })
  }

  return { nodes, edges, bands: [], direction: 'DOWN', partitioned: true }
}

// --- Data-flow view --------------------------------------------------------
/**
 * Left-to-right request path. Only nodes that take part in at least one edge
 * are shown; ELK ranks the columns from the edge graph (`direction: RIGHT`).
 */
function buildDataFlow(arch: GeneratedArchitecture): DiagramSpec {
  const connected = new Set<string>()
  for (const e of arch.edges) {
    connected.add(e.source)
    connected.add(e.target)
  }
  const nodes = arch.nodes.filter((n) => connected.has(n.id)).map((n) => specNode(n, undefined))
  const edges: SpecEdge[] = arch.edges
    .filter((e) => connected.has(e.source) && connected.has(e.target))
    .map((e, i) => ({
      id: `fe${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      data: { label: e.label, stroke: FLOW_STROKE, animated: true },
    }))

  return { nodes, edges, bands: [], direction: 'RIGHT', partitioned: false }
}

// --- Zone-banded views (deployment & security) -----------------------------
interface Zone {
  caption: string
  accent: string
  layers: LayerId[]
}

const DEPLOYMENT_ZONES: Zone[] = [
  { caption: 'Client / Edge', accent: '#6366f1', layers: ['user', 'application'] },
  { caption: 'Application Tier', accent: '#06b6d4', layers: ['api', 'retrieval', 'model-abstraction', 'observability'] },
  { caption: 'Inference Tier', accent: '#ec4899', layers: ['model-serving', 'compute'] },
  { caption: 'Data Tier', accent: '#eab308', layers: ['data'] },
  { caption: 'Trust & Operations', accent: '#ef4444', layers: ['security', 'operations', 'integration'] },
]

const SECURITY_ZONES: Zone[] = [
  { caption: 'Untrusted / External', accent: '#64748b', layers: ['user', 'integration'] },
  { caption: 'Perimeter / Controlled Entry', accent: '#0ea5e9', layers: ['application', 'api'] },
  { caption: 'Trusted Internal', accent: '#8b5cf6', layers: ['retrieval', 'model-abstraction', 'model-serving', 'compute', 'observability', 'operations'] },
  { caption: 'Restricted Data', accent: '#eab308', layers: ['data'] },
  { caption: 'Governance Controls', accent: '#ef4444', layers: ['security'] },
]

const SECURITY_LAYER_LABEL = LAYERS.find((l) => l.id === 'security')!.label

/** Group nodes into the given zones, returning a contiguous-partition spec. */
function zonedNodesAndBands(
  arch: GeneratedArchitecture,
  zones: Zone[],
  dimWhen: (zone: Zone) => boolean,
): { nodes: SpecNode[]; bands: SpecBand[] } {
  const nodes: SpecNode[] = []
  const bands: SpecBand[] = []
  let partition = 0
  for (const zone of zones) {
    const members = arch.nodes
      .filter((n) => zone.layers.includes(layerIdByLabel.get(n.group)!))
      .sort(byLayerOrder)
    if (members.length === 0) continue
    bands.push({ partition, caption: zone.caption, accent: zone.accent })
    for (const n of members) nodes.push(specNode(n, partition, dimWhen(zone)))
    partition += 1
  }
  return { nodes, bands }
}

function buildDeployment(arch: GeneratedArchitecture): DiagramSpec {
  const { nodes, bands } = zonedNodesAndBands(arch, DEPLOYMENT_ZONES, () => false)
  const edges: SpecEdge[] = arch.edges.map((e, i) => ({
    id: `de${i}-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    data: { stroke: DEPLOY_STROKE },
  }))
  return { nodes, edges, bands, direction: 'DOWN', partitioned: true }
}

/**
 * Trust-boundary layout. Security & governance controls render at full
 * emphasis; every other node is dimmed. Edges touching a security control are
 * highlighted to show what each control governs.
 */
function buildSecurity(arch: GeneratedArchitecture): DiagramSpec {
  const { nodes, bands } = zonedNodesAndBands(arch, SECURITY_ZONES, (z) => !z.layers.includes('security'))

  const securityIds = new Set(
    arch.nodes.filter((n) => n.group === SECURITY_LAYER_LABEL).map((n) => n.id),
  )
  const edges: SpecEdge[] = arch.edges.map((e, i) => {
    const isControl = securityIds.has(e.source) || securityIds.has(e.target)
    return {
      id: `se${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      data: isControl
        ? { label: e.label, stroke: CONTROL_STROKE, strokeWidth: 2, animated: true }
        : { stroke: MUTED_STROKE, dimmed: true },
    }
  })

  return { nodes, edges, bands, direction: 'DOWN', partitioned: true }
}
