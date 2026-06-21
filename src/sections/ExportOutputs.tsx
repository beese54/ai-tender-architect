import { useRef, useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { Card, StepHeader } from '@/components/Section'
import DiagramCanvas from '@/components/DiagramCanvas'
import { useProjectStore } from '@/store/useProjectStore'
import { combinedMarkdown, copyText, downloadDiagramImage, slug, tenderToMarkdown } from '@/generation/exportUtils'

export default function ExportOutputs() {
  // Select atomically — returning a new object from the selector causes an
  // infinite re-render loop (white screen) under zustand v5.
  const input = useProjectStore((s) => s.input)
  const architecture = useProjectStore((s) => s.architecture)
  const tender = useProjectStore((s) => s.tender)

  // Off-screen diagram instance so we can render the architecture to PNG from
  // this step (the visible canvas only exists on the Diagram step).
  const diagramRef = useRef<HTMLDivElement>(null)
  const layoutReady = useRef(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState<'png' | 'md' | null>(null)

  // Resolve once the off-screen diagram has finished its async ELK layout, so
  // the PNG is never captured mid-layout. Falls back after ~3 s.
  const whenLayoutReady = () =>
    new Promise<void>((resolve) => {
      const start = Date.now()
      const tick = () => {
        if (layoutReady.current || Date.now() - start > 3000) resolve()
        else setTimeout(tick, 50)
      }
      tick()
    })

  if (!architecture || !tender) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <p className="text-sm text-slate-500">Nothing to export yet. Generate outputs first.</p>
      </div>
    )
  }

  const base = slug(input.projectTitle || 'ai-solution')
  const flash = (msg: string) => {
    setStatus(msg)
    setTimeout(() => setStatus(null), 3000)
  }

  const copyTenderAndPng = async () => {
    setBusy('png')
    try {
      await copyText(tenderToMarkdown(tender))
      await whenLayoutReady()
      const viewport = diagramRef.current?.querySelector('.react-flow__viewport') as HTMLElement | null
      const target = viewport ?? diagramRef.current
      if (target) await downloadDiagramImage(target, 'png', `${base}-architecture.png`)
      flash('Tender copied to clipboard · architecture picture (PNG) downloaded.')
    } finally {
      setBusy(null)
    }
  }

  const copyTenderAndMarkdown = async () => {
    setBusy('md')
    try {
      await copyText(combinedMarkdown(input, architecture, tender))
      flash('Tender and architecture (Markdown) copied to clipboard.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <StepHeader
        title="Export / Copy Output"
        description="Choose how to take the tender and architecture out. The tender is copied to your clipboard; the architecture comes either as a picture or as Markdown."
      />
      <div className="space-y-5">
        <Card title="Copy / export">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={copyTenderAndPng}
              disabled={busy !== null}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy === 'png' ? 'Preparing…' : 'Copy tender + architecture picture (PNG)'}
            </button>
            <button
              onClick={copyTenderAndMarkdown}
              disabled={busy !== null}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60"
            >
              {busy === 'md' ? 'Copying…' : 'Copy tender + architecture (Markdown)'}
            </button>
          </div>
          {status && <p className="text-xs font-medium text-emerald-600">✓ {status}</p>}
        </Card>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card title="Assumptions">
            <List items={architecture.assumptions} empty="No assumptions were required." />
          </Card>
          <Card title="Vendor lock-in & design risks">
            <List items={architecture.risks} empty="No notable risks identified." />
          </Card>
          <Card title="Recommended evaluation criteria">
            <List items={tender.evaluationCriteria} empty="Evaluation criteria not generated." />
          </Card>
        </div>
      </div>

      {/* Off-screen diagram used only to capture the architecture PNG. */}
      <div aria-hidden className="pointer-events-none fixed -left-[12000px] top-0 h-[900px] w-[1500px]">
        <ReactFlowProvider>
          <DiagramCanvas
            containerRef={diagramRef}
            onReady={() => {
              layoutReady.current = true
            }}
          />
        </ReactFlowProvider>
      </div>
    </div>
  )
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-slate-400">{empty}</p>
  return (
    <ul className="list-disc space-y-1.5 pl-4">
      {items.map((it, i) => (
        <li key={i} className="text-sm text-slate-600">
          {it}
        </li>
      ))}
    </ul>
  )
}
