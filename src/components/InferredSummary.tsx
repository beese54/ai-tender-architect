import { useProjectStore } from '@/store/useProjectStore'

function ChipRow({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="mb-2 last:mb-0">
      <p className="mb-1 text-xs font-semibold text-slate-500">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span key={it} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
            {it}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Read-only view of what the AI inferred from the project intake. */
export default function InferredSummary() {
  const inferred = useProjectStore((s) => s.inferred)
  if (!inferred) return null

  return (
    <details className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
      <summary className="cursor-pointer text-sm font-medium text-indigo-700">
        AI-inferred configuration — derived from your intake
      </summary>
      <div className="mt-3">
        <ChipRow title="AI capabilities" items={inferred.aiCapabilities} />
        <ChipRow title="Model & serving strategy" items={inferred.modelStrategy} />
        <ChipRow title="Architecture priorities" items={inferred.architecturePriorities} />
        <ChipRow title="Security requirements" items={inferred.securityRequirements} />
        <ChipRow
          title="Performance targets"
          items={[
            inferred.performanceRequirements.latencyTarget,
            inferred.performanceRequirements.availabilityTarget,
            inferred.performanceRequirements.throughputTarget,
          ].filter((x): x is string => Boolean(x))}
        />
      </div>
    </details>
  )
}
