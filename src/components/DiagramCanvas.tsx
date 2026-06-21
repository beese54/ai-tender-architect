import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import ReactFlow, { Background, Controls, MiniMap, useReactFlow, useStoreApi } from 'reactflow'
import type { Edge, Node } from 'reactflow'
import { archNodeTypes } from '@/flow/archNodeTypes'
import { archEdgeTypes } from '@/flow/edgeTypes'
import { layoutDiagram } from '@/generation/elkLayout'
import { NODE_HEIGHT, NODE_WIDTH } from '@/generation/diagramGenerator'
import type { ArchNodeData, DiagramView } from '@/generation/diagramGenerator'
import type { GeneratedArchitecture } from '@/types/architecture'
import { useProjectStore } from '@/store/useProjectStore'

const EMPTY_NODES: Node[] = []
const EMPTY_EDGES: Edge[] = []

const MIN_ZOOM = 0.05
const MAX_ZOOM = 2

interface LayoutResult {
  nodes: Node[]
  edges: Edge[]
  arch: GeneratedArchitecture
  view: DiagramView
}

/** Read-only React Flow render of the generated architecture (ELK-routed). */
export default function DiagramCanvas({
  containerRef,
  onReady,
}: {
  containerRef?: RefObject<HTMLDivElement>
  onReady?: () => void
}) {
  const architecture = useProjectStore((s) => s.architecture)
  const view = useProjectStore((s) => s.diagramView)

  const [result, setResult] = useState<LayoutResult | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const { fitBounds, getViewport, setViewport } = useReactFlow()
  const storeApi = useStoreApi()

  // Keep the latest onReady without making it a layout dependency.
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  })

  // Lay out asynchronously (ELK) whenever the architecture or view changes.
  useEffect(() => {
    if (!architecture) return
    let cancelled = false
    layoutDiagram(architecture, view)
      .then((laid) => {
        if (cancelled) return
        setResult({ ...laid, arch: architecture, view })
        onReadyRef.current?.()
      })
      .catch((err) => {
        if (!cancelled) console.error('Diagram layout failed', err)
      })
    return () => {
      cancelled = true
    }
  }, [architecture, view])

  // `loading` is derived: true until the stored result matches the current view.
  const ready = !!result && result.arch === architecture && result.view === view
  const baseNodes = ready ? result!.nodes : EMPTY_NODES
  const baseEdges = ready ? result!.edges : EMPTY_EDGES

  // Hover emphasis: highlight the hovered node + its neighbours and connecting
  // edges, dim the rest. Falls back to each node's static `dimmed` (security
  // view) when nothing is hovered.
  const neighbours = useMemo(() => {
    if (!hoveredId) return null
    const ids = new Set<string>([hoveredId])
    const edgeIds = new Set<string>()
    for (const e of baseEdges) {
      if (e.source === hoveredId || e.target === hoveredId) {
        edgeIds.add(e.id)
        ids.add(e.source)
        ids.add(e.target)
      }
    }
    return { ids, edgeIds }
  }, [hoveredId, baseEdges])

  const nodes = useMemo<Node[]>(() => {
    if (!neighbours) return baseNodes
    return baseNodes.map((n) => {
      if (n.type !== 'arch') return n
      const dimmed = !neighbours.ids.has(n.id)
      const data = n.data as ArchNodeData
      return data.dimmed === dimmed ? n : { ...n, data: { ...data, dimmed } }
    })
  }, [baseNodes, neighbours])

  const edges = useMemo<Edge[]>(() => {
    if (!neighbours) return baseEdges
    return baseEdges.map((e) => {
      const dimmed = !neighbours.edgeIds.has(e.id)
      // Routed (ELK) edges read opacity from data.dimmed; native banded edges
      // read it from style.opacity — set both so either renderer dims.
      const style = { ...(e.style ?? {}), opacity: dimmed ? 0.2 : 1 }
      const data = e.data ? { ...e.data, dimmed } : e.data
      return { ...e, style, data }
    })
  }, [baseEdges, neighbours])

  // Bounding box of the laid-out content, computed from the layout itself
  // (ELK/band layout was given NODE_WIDTH/NODE_HEIGHT, so positions + those
  // sizes describe every node). We deliberately do NOT rely on React Flow
  // having *measured* the rendered nodes here — see the fit effect below.
  const bbox = useMemo(() => {
    const ns = ready ? result!.nodes : null
    if (!ns || ns.length === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of ns) {
      const w = n.width ?? NODE_WIDTH
      const h = n.height ?? NODE_HEIGHT
      minX = Math.min(minX, n.position.x)
      minY = Math.min(minY, n.position.y)
      maxX = Math.max(maxX, n.position.x + w)
      maxY = Math.max(maxY, n.position.y + h)
    }
    return { minX, minY, maxX, maxY }
  }, [ready, result])

  // Fit the viewport to the laid-out content whenever a new layout is shown.
  // We must NOT use React Flow's own `fitView`/`fitViewOnInit`: those only work
  // once it has *measured* every custom node, but under StrictMode the nodes are
  // first measured at 0×0 and the re-measure never lands, so `useNodesInitialized`
  // stays false forever — fitView becomes a silent no-op and the viewport sits at
  // identity zoom, showing only the few nodes near the origin (the "white screen").
  // Since we already know the exact content box, fit to it directly via fitBounds,
  // which needs no node measurement. The rAF lets the pane reach its final size
  // after a step/view switch before we measure the fit.
  useEffect(() => {
    if (!bbox) return
    const id = requestAnimationFrame(() =>
      fitBounds(
        { x: bbox.minX, y: bbox.minY, width: bbox.maxX - bbox.minX, height: bbox.maxY - bbox.minY },
        { padding: 0.1, duration: 0 },
      ),
    )
    return () => cancelAnimationFrame(id)
  }, [bbox, fitBounds])

  // Guarantee the diagram can never be fully panned/zoomed off-screen. After any
  // pan or zoom gesture, clamp the viewport so the centre of the pane always sits
  // over the content's bounding box — so the middle of the screen is always
  // filled with diagram, never blank. The user's zoom is preserved (we do NOT
  // snap back to a full fit). This is the dependable backstop for React Flow's
  // `translateExtent`, which does not reliably clamp panning at high zoom.
  const selfMove = useRef(false)
  const clampViewport = useCallback(() => {
    // Ignore the move-end fired by our own corrective setViewport below.
    if (selfMove.current) {
      selfMove.current = false
      return
    }
    if (!bbox) return
    const { width, height } = storeApi.getState()
    if (!width || !height) return
    const { x, y, zoom } = getViewport()
    // Pane centre maps to flow coord ((paneEdge/2 - origin) / zoom). Keep that
    // within [bMin, bMax] ⇒ origin ∈ [paneEdge/2 - bMax*zoom, paneEdge/2 - bMin*zoom].
    const clampAxis = (v: number, paneEdge: number, bMin: number, bMax: number) => {
      const min = paneEdge / 2 - bMax * zoom
      const max = paneEdge / 2 - bMin * zoom
      return Math.min(Math.max(v, min), max)
    }
    const nx = clampAxis(x, width, bbox.minX, bbox.maxX)
    const ny = clampAxis(y, height, bbox.minY, bbox.maxY)
    if (Math.abs(nx - x) > 0.5 || Math.abs(ny - y) > 0.5) {
      selfMove.current = true
      setViewport({ x: nx, y: ny, zoom }, { duration: 0 })
    }
  }, [bbox, storeApi, getViewport, setViewport])

  return (
    <div ref={containerRef} className="relative h-full w-full bg-white">
      {!ready && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">Laying out…</span>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={archNodeTypes}
        edgeTypes={archEdgeTypes}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        onMoveEnd={clampViewport}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeMouseEnter={(_, n) => setHoveredId(n.id)}
        onNodeMouseLeave={() => setHoveredId(null)}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} color="#e2e8f0" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}
