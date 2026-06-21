import { Card, StepHeader } from '@/components/Section'
import { CheckGroup, CommaListField, NumberUnitField, RadioGroup, TextArea, TextField, Toggle } from '@/components/form/controls'
import { useProjectStore } from '@/store/useProjectStore'
import {
  CADENCE_OPTIONS,
  CORPUS_UNIT_OPTIONS,
  DATA_SOURCES,
  DATA_TYPES,
  DEPLOYMENT_OPTIONS,
  PROJECT_STAGES,
  SENSITIVITY_OPTIONS,
  USE_CASES,
} from '@/constants/formOptions'
import type { CorpusUnit } from '@/types/project'
import { deriveTargets } from '@/generation/derivePerformanceTargets'

export default function ProjectIntake() {
  const input = useProjectStore((s) => s.input)
  const update = useProjectStore((s) => s.updateInput)
  const updateNested = useProjectStore((s) => s.updateNested)
  const perf = input.performanceRequirements
  const prefs = input.tenderPreferences
  // Live preview of the targets the system will set for the user.
  const targets = deriveTargets(perf, input.projectStage)

  return (
    <div>
      <StepHeader
        title="Project Intake"
        description="Fill this in and click Generate — the AI infers the AI capabilities, model/serving strategy, architecture priorities and security requirements for you. Only the fields below need your input."
      />
      <div className="space-y-5">
        <Card title="Project details">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Project title" value={input.projectTitle} onChange={(v) => update({ projectTitle: v })} placeholder="e.g. Internal Knowledge Assistant" />
            <TextField label="Organisation / department" value={input.organisation} onChange={(v) => update({ organisation: v })} />
          </div>
          <TextArea label="Project background" value={input.background} onChange={(v) => update({ background: v })} />
          <TextArea label="Problem statement" value={input.problemStatement} onChange={(v) => update({ problemStatement: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CommaListField label="Intended users" value={input.intendedUsers} onChange={(v) => update({ intendedUsers: v })} placeholder="Staff, Administrators, Approvers" />
            <CommaListField label="Desired business outcomes" value={input.businessOutcomes} onChange={(v) => update({ businessOutcomes: v })} />
          </div>
          <TextArea label="User pain points" value={input.userPainPoints} onChange={(v) => update({ userPainPoints: v })} rows={2} />
          <RadioGroup label="Tender is for a…" options={PROJECT_STAGES} value={input.projectStage} onChange={(v) => update({ projectStage: v as typeof input.projectStage })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Expected timeline" value={input.timeline} onChange={(v) => update({ timeline: v })} placeholder="e.g. 6 months" />
            <TextField label="Expected number of users" value={input.expectedUsers} onChange={(v) => update({ expectedUsers: v })} />
            <TextField label="Departments / agencies" value={input.departmentsInvolved} onChange={(v) => update({ departmentsInvolved: v })} />
          </div>
        </Card>

        <Card title="Use cases" description="Select all that apply, or add a custom one.">
          <CheckGroup label="Use cases" options={USE_CASES} value={input.useCases} onChange={(v) => update({ useCases: v })} />
          <TextField label="Custom use case (optional)" value={input.customUseCase ?? ''} onChange={(v) => update({ customUseCase: v })} />
        </Card>

        <Card title="Data & knowledge sources">
          <CheckGroup label="Data sources" options={DATA_SOURCES} value={input.dataSources} onChange={(v) => update({ dataSources: v })} />
          <CheckGroup label="Data & document types" options={DATA_TYPES} value={input.dataTypes} onChange={(v) => update({ dataTypes: v })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <RadioGroup label="Data cadence" options={CADENCE_OPTIONS} value={input.dataCadence} onChange={(v) => update({ dataCadence: v as typeof input.dataCadence })} />
            <RadioGroup label="Deployment preference" options={DEPLOYMENT_OPTIONS} value={input.deploymentPreference} onChange={(v) => update({ deploymentPreference: v as typeof input.deploymentPreference })} />
            <RadioGroup label="Data sensitivity" options={SENSITIVITY_OPTIONS} value={input.dataSensitivity} onChange={(v) => update({ dataSensitivity: v as typeof input.dataSensitivity })} />
          </div>
        </Card>

        <Card title="Scale & performance" description="Tell us the expected scale. The latency, availability and throughput targets are then set for you to standards-based defaults — no need to guess.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Concurrent users" value={perf.concurrentUsers ?? ''} onChange={(v) => updateNested('performanceRequirements', { concurrentUsers: v })} placeholder="e.g. 200" />
            <TextField label="Daily query volume" value={perf.dailyQueryVolume ?? ''} onChange={(v) => updateNested('performanceRequirements', { dailyQueryVolume: v })} placeholder="e.g. 10,000" />
          </div>
          <NumberUnitField
            label="Document corpus size"
            value={perf.documentCorpusSize ?? ''}
            unit={perf.documentCorpusUnit ?? 'GB'}
            unitOptions={CORPUS_UNIT_OPTIONS}
            onValueChange={(v) => updateNested('performanceRequirements', { documentCorpusSize: v })}
            onUnitChange={(v) => updateNested('performanceRequirements', { documentCorpusUnit: v as CorpusUnit })}
            placeholder="e.g. 250"
            hint="Total size of the entire knowledge base / document corpus to be indexed — not a single document."
          />

          <div className="rounded-md border border-indigo-100 bg-indigo-50/40 p-3">
            <p className="text-sm font-medium text-indigo-700">Recommended performance targets — set automatically</p>
            <p className="mb-2 mt-0.5 text-xs text-slate-500">
              Derived from your expected scale with a built-in safety buffer for unforeseen growth. You don’t need to fill these in.
            </p>
            <dl className="space-y-2">
              <TargetRow label="Latency" value={targets.latencyTarget} rationale={targets.rationale.latency} />
              <TargetRow label="Availability" value={targets.availabilityTarget} rationale={targets.rationale.availability} />
              <TargetRow label="Throughput" value={targets.throughputTarget} rationale={targets.rationale.throughput} />
            </dl>
          </div>
        </Card>

        <Card title="Tender output" description="The tender is generated in a procurement-ready, technical and detailed style by default.">
          <div className="space-y-3">
            <Toggle
              label="Include AI task-delegation plan"
              hint="On by default. Decomposes each use case into deterministic / model / hybrid subtasks, flags anti-patterns, and adds deterministic-safeguard clauses to the tender."
              checked={prefs.includeDelegationPlan}
              onChange={(v) => updateNested('tenderPreferences', { includeDelegationPlan: v })}
            />
            <Toggle
              label="Include non-mandatory reference examples"
              hint="Off by default keeps the tender fully vendor-neutral. When on, example technologies appear in a clearly-labelled optional section."
              checked={prefs.includeReferenceExamples}
              onChange={(v) => updateNested('tenderPreferences', { includeReferenceExamples: v })}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}

function TargetRow({ label, value, rationale }: { label: string; value: string; rationale: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="w-24 flex-none text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-700">
        <span className="font-medium text-slate-900">{value}</span>
        <span className="block text-xs text-slate-400">{rationale}</span>
      </dd>
    </div>
  )
}
