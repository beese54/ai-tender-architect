import type { ReactNode } from 'react'
import { STEPS, useProjectStore, azureAvailable } from '@/store/useProjectStore'
import type { StepId, ProviderId } from '@/store/useProjectStore'
import { PRESETS } from '@/constants/presets'
import ProjectIntake from '@/sections/ProjectIntake'
import DiagramPreview from '@/sections/DiagramPreview'
import TenderPreview from '@/sections/TenderPreview'
import ExportOutputs from '@/sections/ExportOutputs'

const SECTION_COMPONENTS: Record<StepId, () => ReactNode> = {
  intake: ProjectIntake,
  diagram: DiagramPreview,
  tender: TenderPreview,
  export: ExportOutputs,
}

export default function App() {
  const currentStep = useProjectStore((s) => s.currentStep)
  const setStep = useProjectStore((s) => s.setStep)
  const generate = useProjectStore((s) => s.generate)
  const loadPreset = useProjectStore((s) => s.loadPreset)
  const reset = useProjectStore((s) => s.reset)
  const hasOutput = useProjectStore((s) => s.tender !== null)
  const provider = useProjectStore((s) => s.provider)
  const setProvider = useProjectStore((s) => s.setProvider)
  const isGenerating = useProjectStore((s) => s.isGenerating)
  const genError = useProjectStore((s) => s.genError)

  const ActiveSection = SECTION_COMPONENTS[currentStep] ?? SECTION_COMPONENTS.intake
  const stepIndex = Math.max(0, STEPS.findIndex((s) => s.id === currentStep))

  const goGenerate = async () => {
    await generate()
    // Only advance once output exists (a failed generation leaves it null).
    if (useProjectStore.getState().tender) setStep('diagram')
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-100 text-slate-900">
      {/* Top bar */}
      <header className="flex flex-none items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3">
        <div>
          <h1 className="text-sm font-semibold text-slate-800">Vendor-Agnostic AI Architecture &amp; Tender Generator</h1>
          <p className="text-xs text-slate-400">Design open, modular AI systems and generate procurement-ready, vendor-neutral tenders.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) loadPreset(e.target.value)
              e.target.value = ''
            }}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700"
          >
            <option value="" disabled>
              Load sample preset…
            </option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Engine
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderId)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
              title={azureAvailable ? undefined : 'Azure OpenAI is not configured — set VITE_AZURE_OPENAI_* in .env.local'}
            >
              <option value="rule-based">Rule-based</option>
              <option value="azure" disabled={!azureAvailable}>
                Azure OpenAI{azureAvailable ? '' : ' (not configured)'}
              </option>
            </select>
          </label>
          <button onClick={reset} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:border-slate-400">
            Reset
          </button>
          <button
            onClick={goGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {isGenerating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </header>

      {genError && (
        <div className="flex flex-none items-center justify-between gap-4 border-b border-rose-200 bg-rose-50 px-5 py-2 text-sm text-rose-700">
          <span>Generation failed: {genError}</span>
          <button
            onClick={() => useProjectStore.setState({ genError: null })}
            className="rounded border border-rose-300 px-2 py-0.5 text-xs hover:bg-rose-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Stepper sidebar */}
        <nav className="flex w-60 flex-none flex-col gap-1 overflow-y-auto border-r border-slate-200 bg-white p-3">
          {STEPS.map((step, i) => {
            const active = step.id === currentStep
            const isOutput = step.id === 'diagram' || step.id === 'tender' || step.id === 'export'
            const disabled = isOutput && !hasOutput
            return (
              <button
                key={step.id}
                onClick={() => !disabled && setStep(step.id)}
                disabled={disabled}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                  active
                    ? 'bg-indigo-50 font-medium text-indigo-700'
                    : disabled
                      ? 'cursor-not-allowed text-slate-300'
                      : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs ${
                    i <= stepIndex ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {i + 1}
                </span>
                {step.label}
              </button>
            )
          })}
          {!hasOutput && (
            <p className="mt-2 px-3 text-xs text-slate-400">Preview steps unlock after you click Generate.</p>
          )}
        </nav>

        {/* Active section. The diagram uses the full window; forms stay in a
            readable centred column. */}
        <main className="min-w-0 flex-1 overflow-hidden">
          {currentStep === 'diagram' ? (
            <div className="h-full p-3">
              <ActiveSection />
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <div className="mx-auto h-full max-w-4xl">
                <ActiveSection />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
