import type { Edge, Node } from 'reactflow'
import { MarkerType } from 'reactflow'
import type { DiagramSpec, GroupLabelData } from '@/generation/diagramGenerator'
import { NODE_WIDTH } from '@/generation/diagramGenerator'

/**
 * Deterministic banded grid layout for the "catalog by layer" views
 * (logical, deployment, security, conceptual). Each partition is one centred
 * row — isolated nodes sit tidily alongside connected ones, which ELK's flow
 * layout cannot do (intra-layer edges make it split a band into sub-rows).
 * Edges are gentle bezier curves so overlapping lines fan out rather than
 * stacking on the same orthogonal grid; hover-highlight aids tracing.
 */

const H_SPACING = NODE_WIDTH + 36
const BAND_HEIGHT = 160
const PAD = 24
const CAPTION_GUTTER = 208

// Edge labels are drawn as an SVG <rect> whose white fill normally comes from a
// stylesheet class. html-to-image does not inline class-based SVG fills, so the
// rect renders black over the text. Inline styles keep exported labels readable.
const labelProps = {
  labelStyle: { fill: '#475569', fontWeight: 600 },
  labelBgStyle: { fill: '#ffffff' },
  labelBgPadding: [4, 2] as [number, number],
  labelBgBorderRadius: 4,
}

export function buildBandedLayout(spec: DiagramSpec): { nodes: Node[]; edges: Edge[] } {
  const partitions = [...new Set(spec.nodes.map((n) => n.partition ?? 0))].sort((a, b) => a - b)
  const byPartition = new Map<number, typeof spec.nodes>()
  for (const p of partitions) byPartition.set(p, [])
  for (const n of spec.nodes) byPartition.get(n.partition ?? 0)!.push(n)

  const hasCaptions = spec.bands.length > 0
  const gutter = hasCaptions ? CAPTION_GUTTER : 0
  const maxCount = Math.max(1, ...partitions.map((p) => byPartition.get(p)!.length))
  const totalWidth = maxCount * H_SPACING
  const captionByPartition = new Map(spec.bands.map((b) => [b.partition, b]))

  const nodes: Node[] = []
  partitions.forEach((p, bandIdx) => {
    const row = byPartition.get(p)!
    const y = PAD + bandIdx * BAND_HEIGHT

    const caption = captionByPartition.get(p)
    if (caption) {
      nodes.push({
        id: `caption-${p}`,
        type: 'groupLabel',
        position: { x: PAD, y: y + 8 },
        data: { label: caption.caption, accent: caption.accent } satisfies GroupLabelData,
        draggable: false,
        selectable: false,
      })
    }

    const rowWidth = row.length * H_SPACING
    const startX = gutter + PAD + (totalWidth - rowWidth) / 2
    row.forEach((n, i) => {
      nodes.push({
        id: n.id,
        type: 'arch',
        position: { x: startX + i * H_SPACING, y },
        data: n.data,
        draggable: false,
      })
    })
  })

  const edges: Edge[] = spec.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.data.label,
    type: 'default', // bezier — curves separate overlapping lines
    animated: e.data.animated ?? false,
    style: {
      stroke: e.data.stroke,
      strokeWidth: e.data.strokeWidth ?? 1.5,
      ...(e.data.dimmed ? { opacity: 0.3 } : {}),
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: e.data.stroke, width: 16, height: 16 },
    ...(e.data.label ? labelProps : {}),
  }))

  return { nodes, edges }
}
