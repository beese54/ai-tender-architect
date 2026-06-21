import { EdgeLabelRenderer } from 'reactflow'
import type { EdgeProps } from 'reactflow'

interface Point {
  x: number
  y: number
}

export interface RoutedEdgeData {
  /** Orthogonal route points (start → bends → end) in flow coordinates. */
  points: Point[]
  label?: string
  stroke: string
  strokeWidth?: number
  animated?: boolean
  /** De-emphasised (security non-control edges, or hover dimming). */
  dimmed?: boolean
}

/** Move `from` toward `toward` by up to `r`, for rounded orthogonal corners. */
function shorten(from: Point, toward: Point, r: number): Point {
  const dx = toward.x - from.x
  const dy = toward.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const d = Math.min(r, len / 2)
  return { x: from.x + (dx / len) * d, y: from.y + (dy / len) * d }
}

function buildPath(points: Point[], radius = 8): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`
  }
  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    const next = points[i + 1]
    const p1 = shorten(cur, prev, radius)
    const p2 = shorten(cur, next, radius)
    d += ` L ${p1.x},${p1.y} Q ${cur.x},${cur.y} ${p2.x},${p2.y}`
  }
  const last = points[points.length - 1]
  d += ` L ${last.x},${last.y}`
  return d
}

/**
 * Renders an edge along ELK's pre-computed orthogonal route. The label is drawn
 * as HTML via EdgeLabelRenderer, which avoids the SVG-fill black-box that
 * React Flow's default SVG label background suffers during html-to-image export.
 */
export default function RoutedEdge({ id, data, markerEnd }: EdgeProps<RoutedEdgeData>) {
  if (!data || data.points.length < 2) return null
  const opacity = data.dimmed ? 0.3 : 1
  const path = buildPath(data.points)
  const mid = data.points[Math.floor(data.points.length / 2)]

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={path}
        fill="none"
        stroke={data.stroke}
        strokeWidth={data.strokeWidth ?? 1.5}
        markerEnd={markerEnd}
        style={{ opacity }}
      />
      {data.label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 shadow-sm"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)`,
              opacity,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
