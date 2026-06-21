import { useRef } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { StepHeader } from '@/components/Section'
import DiagramCanvas from '@/components/DiagramCanvas'
import InferredSummary from '@/components/InferredSummary'
import { useProjectStore } from '@/store/useProjectStore'
import type { DiagramView } from '@/generation/diagramGenerator'
import { downloadDiagramImage, slug } from '@/generation/exportUtils'

const VIEWS: { id: DiagramView; label: string }[] = [
  { id: 'conceptual', label: 'Conceptual' },
  { id: 'logical', label: 'Logical' },
  { id: 'data-flow', label: 'Data flow' },
  { id: 'deployment', label: 'Deployment' },
  { id: 'security', label: 'Security' },
]

export default function DiagramPreview() {
  const architecture = useProjectStore((s) => s.architecture)
  const view = useProjectStore((s) => s.diagramView)
  const setView = useProjectStore((s) => s.setDiagramView)
  const containerRef = useRef<HTMLDivElement>(null)

  const exportImage = async (format: 'png' | 'svg') => {
    const viewport = containerRef.current?.querySelector('.react-flow__viewport') as HTMLElement | null
    const target = viewport ?? containerRef.current
    if (!target) return
    await downloadDiagramImage(target, format, `${slug(architecture?.title ?? 'architecture')}.${format}`)
  }

  if (!architecture) return <EmptyState />

  return (
    <div className="flex h-full flex-col">
      <StepHeader title="Diagram Preview" description="A vendor-neutral, layered architecture generated from your inputs. Layers flow top-down, from user channels to operations." />

      <InferredSummary />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap rounded-md border border-slate-300 bg-white p-0.5 text-sm">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`rounded px-3 py-1 transition ${
                view === v.id ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportImage('svg')} className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:border-indigo-300">
            Export SVG
          </button>
          <button onClick={() => exportImage('png')} className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:border-indigo-300">
            Export PNG
          </button>
        </div>
      </div>

      <div className="min-h-[420px] flex-1 overflow-hidden rounded-lg border border-slate-200">
        <ReactFlowProvider>
          <DiagramCanvas containerRef={containerRef} />
        </ReactFlowProvider>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-center">
      <div>
        <p className="text-sm text-slate-500">No architecture generated yet.</p>
        <p className="text-xs text-slate-400">Load a preset or fill the form, then click Generate.</p>
      </div>
    </div>
  )
}
