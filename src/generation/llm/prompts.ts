import type { ProjectInput } from '@/types/project'
import type { GeneratedArchitecture } from '@/types/architecture'
import type { GeneratedTender, TenderSection } from '@/types/tender'
import type { ChatMessage } from './azureClient'

/** Compact, human-readable summary of the intake for prompt context. */
function summariseIntake(input: ProjectInput): string {
  const p = input.performanceRequirements
  const lines = [
    `Project: ${input.projectTitle || '(untitled)'}`,
    `Organisation: ${input.organisation || '(unspecified)'}`,
    `Stage: ${input.projectStage}`,
    `Background: ${input.background || '(none)'}`,
    `Problem: ${input.problemStatement || '(none)'}`,
    `Intended users: ${input.intendedUsers.join(', ') || '(none)'}`,
    `Business outcomes: ${input.businessOutcomes.join(', ') || '(none)'}`,
    `Use cases: ${[...input.useCases, input.customUseCase].filter(Boolean).join(', ') || '(none)'}`,
    `Data sources: ${input.dataSources.join(', ') || '(none)'}`,
    `Data types: ${input.dataTypes.join(', ') || '(none)'}`,
    `Data cadence: ${input.dataCadence}; Deployment: ${input.deploymentPreference}; Sensitivity: ${input.dataSensitivity}`,
    `AI capabilities: ${input.aiCapabilities.join(', ') || '(none)'}`,
    `Model strategy: ${input.modelStrategy.join(', ') || '(none)'}`,
    `Architecture priorities: ${input.architecturePriorities.join(', ') || '(none)'}`,
    `Security requirements: ${input.securityRequirements.join(', ') || '(none)'}`,
    `Scale: ${p.concurrentUsers || '?'} concurrent users, ${p.dailyQueryVolume || '?'} queries/day, corpus ${p.documentCorpusSize || '?'}${p.documentCorpusUnit || ''}`,
  ]
  return lines.join('\n')
}

const NEUTRALITY_RULE =
  'CRITICAL: Remain strictly vendor-neutral. Never name specific commercial vendors, products, or brands (no cloud providers, model names, or database brands) in mandatory text. Describe capabilities and open standards instead.'

/**
 * Prompt to (re)write only the narrative fields of the architecture:
 * `assumptions` and `risks`. The structural nodes/edges stay deterministic.
 */
export function buildArchitectureNarrativePrompt(
  input: ProjectInput,
  scaffold: GeneratedArchitecture,
): ChatMessage[] {
  const nodeList = scaffold.nodes
    .map((n) => `- ${n.label} (${n.group})${n.required ? '' : ' [optional]'}`)
    .join('\n')

  return [
    {
      role: 'system',
      content:
        'You are a senior, vendor-neutral AI solution architect writing for a public-sector procurement document. ' +
        NEUTRALITY_RULE +
        ' Respond ONLY with a JSON object of the form {"assumptions": string[], "risks": string[]}.',
    },
    {
      role: 'user',
      content:
        `Given this project intake:\n${summariseIntake(input)}\n\n` +
        `and this proposed vendor-neutral architecture (layer in parentheses):\n${nodeList}\n\n` +
        'Write 4-7 concise, specific design ASSUMPTIONS and 4-7 vendor LOCK-IN / delivery RISKS ' +
        '(each one sentence, procurement-appropriate, vendor-neutral). ' +
        'Return JSON: {"assumptions": [...], "risks": [...]}.',
    },
  ]
}

/**
 * Prompt to rewrite the PROSE of an existing tender scaffold while preserving
 * its exact structure (section headings, clause ids, clause levels). The model
 * returns the same shape with improved `intro`/clause `text`.
 */
export function buildTenderProsePrompt(
  input: ProjectInput,
  scaffold: GeneratedTender,
): ChatMessage[] {
  // Send a stripped scaffold so the model knows exactly what to fill in.
  const skeleton = {
    title: scaffold.title,
    sections: scaffold.sections.map((s) => ({
      heading: s.heading,
      intro: s.intro ?? '',
      isReferenceExamples: !!s.isReferenceExamples,
      clauses: s.clauses.map((c) => ({ id: c.id, level: c.level, text: c.text })),
    })),
    evaluationCriteria: scaffold.evaluationCriteria,
    acceptanceTests: scaffold.acceptanceTests,
    deliverables: scaffold.deliverables,
  }

  return [
    {
      role: 'system',
      content:
        'You are a senior procurement consultant refining a vendor-neutral AI system tender. ' +
        'You will receive a JSON tender scaffold. Rewrite the PROSE to read like an expert human consultant: ' +
        'clearer, more specific to the project, and professionally worded. ' +
        NEUTRALITY_RULE +
        ' STRICT RULES: keep the SAME set of sections (same "heading" values, same order); ' +
        'keep every clause "id" and its "level" ("shall"/"should") UNCHANGED; only improve "intro" and clause "text"; ' +
        'do not add or remove sections or clauses; keep "isReferenceExamples" as given. ' +
        'You may refine the strings in evaluationCriteria, acceptanceTests and deliverables but keep their counts similar. ' +
        'Respond ONLY with the JSON object in the same shape as the input.',
    },
    {
      role: 'user',
      content:
        `Project context:\n${summariseIntake(input)}\n\n` +
        `Tender scaffold to refine (return the same JSON shape):\n${JSON.stringify(skeleton)}`,
    },
  ]
}

/** Validate + coerce the architecture-narrative JSON into string arrays. */
export function parseArchitectureNarrative(data: unknown): { assumptions: string[]; risks: string[] } | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  const toStrings = (v: unknown): string[] | null =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : null
  const assumptions = toStrings(obj.assumptions)
  const risks = toStrings(obj.risks)
  if (!assumptions || !risks || assumptions.length === 0 || risks.length === 0) return null
  return { assumptions, risks }
}

/**
 * Merge LLM tender prose back onto the deterministic scaffold, preserving its
 * structure. Falls back per-field to the scaffold value when the model omitted
 * or mangled something. Returns null only if the response is unusable.
 */
export function mergeTenderProse(scaffold: GeneratedTender, data: unknown): GeneratedTender | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  const sectionsRaw = obj.sections
  if (!Array.isArray(sectionsRaw)) return null

  // Index the model's sections by heading for tolerant matching.
  const byHeading = new Map<string, Record<string, unknown>>()
  for (const s of sectionsRaw) {
    if (s && typeof s === 'object' && typeof (s as { heading?: unknown }).heading === 'string') {
      byHeading.set((s as { heading: string }).heading, s as Record<string, unknown>)
    }
  }

  const str = (v: unknown, fallback: string): string =>
    typeof v === 'string' && v.trim().length > 0 ? v : fallback

  const sections: TenderSection[] = scaffold.sections.map((orig) => {
    const m = byHeading.get(orig.heading)
    if (!m) return orig
    const clausesRaw = Array.isArray(m.clauses) ? (m.clauses as Record<string, unknown>[]) : []
    const textById = new Map<string, string>()
    for (const c of clausesRaw) {
      if (c && typeof c.id === 'string' && typeof c.text === 'string') textById.set(c.id, c.text)
    }
    // Use the model's intro when it provides a non-empty one; otherwise keep
    // whatever the scaffold had (which may be undefined).
    const intro = typeof m.intro === 'string' && m.intro.trim().length > 0 ? m.intro : orig.intro
    return {
      ...orig,
      intro,
      // Preserve every original clause id + level; only swap in improved text.
      clauses: orig.clauses.map((c) => ({ ...c, text: str(textById.get(c.id), c.text) })),
    }
  })

  const strArray = (v: unknown, fallback: string[]): string[] => {
    if (!Array.isArray(v)) return fallback
    const cleaned = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    return cleaned.length > 0 ? cleaned : fallback
  }

  return {
    title: str(obj.title, scaffold.title),
    sections,
    evaluationCriteria: strArray(obj.evaluationCriteria, scaffold.evaluationCriteria),
    acceptanceTests: strArray(obj.acceptanceTests, scaffold.acceptanceTests),
    deliverables: strArray(obj.deliverables, scaffold.deliverables),
    // The structured delegation plan stays deterministic — carry it through.
    delegationPlan: scaffold.delegationPlan,
  }
}
