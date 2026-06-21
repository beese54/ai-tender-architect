import { StepHeader } from '@/components/Section'
import { useProjectStore } from '@/store/useProjectStore'
import type { DelegationOwner, DelegationPlan } from '@/types/delegation'

export default function TenderPreview() {
  const tender = useProjectStore((s) => s.tender)
  const warnings = useProjectStore((s) => s.warnings)

  if (!tender) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <p className="text-sm text-slate-500">No tender generated yet. Load a preset or fill the form, then click Generate.</p>
      </div>
    )
  }

  return (
    <div>
      <StepHeader title="Tender Specification" description="Procurement-ready and vendor neutral by default. Numbered clauses use “shall” (mandatory) and “should” (desirable)." />

      {warnings.length > 0 ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-800">
            ⚠ {warnings.length} vendor-neutrality warning{warnings.length === 1 ? '' : 's'}
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            A specific vendor/product name appears in a mandatory or desirable clause. Remove it, or enable “Include
            non-mandatory reference examples” to move such mentions into a clearly-labelled optional section.
          </p>
          <ul className="mt-2 space-y-1">
            {warnings.slice(0, 6).map((w, i) => (
              <li key={i} className="text-xs text-amber-800">
                <span className="font-semibold">{w.term}</span> in “{w.sectionHeading}”
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-800">✓ Vendor neutral — no specific vendor or product names in mandatory clauses.</p>
        </div>
      )}

      {tender.delegationPlan && <DelegationPlanCard plan={tender.delegationPlan} />}

      <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">{tender.title}</h1>
        <div className="mt-4 space-y-6">
          {tender.sections.map((sec, i) => (
            <section key={i}>
              <h2 className="text-base font-semibold text-slate-800">
                {i + 1}. {sec.heading}
                {sec.isReferenceExamples && (
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-slate-500">
                    non-mandatory
                  </span>
                )}
              </h2>
              {sec.intro && <p className="mt-1 text-sm italic text-slate-500">{sec.intro}</p>}
              <ul className="mt-2 space-y-1.5">
                {sec.clauses.map((c, j) => (
                  <li key={c.id} className="flex gap-2 text-sm text-slate-700">
                    <span className="flex-none font-mono text-xs text-slate-400">{i + 1}.{j + 1}</span>
                    <span>
                      <span className={c.level === 'shall' ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}>
                        [{c.level}]
                      </span>{' '}
                      {c.text}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </div>
  )
}

const OWNER_STYLE: Record<DelegationOwner, { badge: string; label: string }> = {
  deterministic: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Deterministic' },
  model: { badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Model' },
  hybrid: { badge: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Hybrid' },
}

function OwnerBadge({ owner }: { owner: DelegationOwner }) {
  const s = OWNER_STYLE[owner]
  return (
    <span className={`flex-none rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.badge}`}>
      {s.label}
    </span>
  )
}

function DetailRow({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <p className="mt-1 text-xs text-slate-500">
      <span className="font-semibold text-slate-600">{label}:</span> {items.join('; ')}
    </p>
  )
}

function DelegationPlanCard({ plan }: { plan: DelegationPlan }) {
  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">AI Task Delegation Plan</h2>
      <p className="mt-1 text-sm text-slate-600">{plan.summary}</p>

      <ul className="mt-3 space-y-2">
        {plan.subtasks.map((s) => (
          <li key={s.id} className="rounded-md border border-slate-100 bg-slate-50/60 p-3">
            <div className="flex items-start gap-2">
              <OwnerBadge owner={s.owner} />
              <p className="text-sm font-medium text-slate-800">{s.task}</p>
            </div>
            <p className="mt-1 text-xs italic text-slate-500">{s.reason}</p>
            <DetailRow label="Evidence fed to model" items={s.evidence} />
            <DetailRow label="Post-checks" items={s.postChecks} />
            {s.fallback && (
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Fallback:</span> {s.fallback}
              </p>
            )}
          </li>
        ))}
      </ul>

      {plan.antiPatterns.length > 0 && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm font-semibold text-rose-800">⚠ Anti-patterns flagged</p>
          <ul className="mt-2 space-y-1.5">
            {plan.antiPatterns.map((a, i) => (
              <li key={i} className="text-xs text-rose-900">
                <span className="font-semibold">{a.risk}</span>{' '}
                <span className="text-rose-700">→ {a.remedy}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
