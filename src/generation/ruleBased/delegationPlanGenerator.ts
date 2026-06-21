import type { ProjectInput } from '@/types/project'
import type {
  DelegationAntiPattern,
  DelegationOwner,
  DelegationPlan,
  DelegationSubtask,
} from '@/types/delegation'

/**
 * Deterministic application of `AI_DELEGATION_FRAMEWORK.md`.
 *
 * Routing each subtask to deterministic/model/hybrid is itself a "classify over
 * a fixed taxonomy with clear rules" task — which §4 of the framework says to do
 * deterministically. So this generator is rule-based: it filters a catalog of
 * subtask archetypes by what the project actually involves, and scans the config
 * for places a model is about to be mis-applied. Same input → identical plan.
 */

const has = (values: string[], needle: string): boolean =>
  values.some((v) => v.toLowerCase().includes(needle.toLowerCase()))
const hasAny = (values: string[], needles: string[]): boolean =>
  needles.some((n) => has(values, n))

/** A subtask archetype plus the condition under which it applies to a project. */
interface Archetype extends Omit<DelegationSubtask, 'id'> {
  when: boolean
}

export function generateDelegationPlan(input: ProjectInput): DelegationPlan {
  const uc = [...input.useCases, input.customUseCase ?? ''].filter(Boolean)
  const caps = input.aiCapabilities
  const dts = input.dataTypes
  const dss = input.dataSources
  const sec = input.securityRequirements
  const outcomes = input.businessOutcomes

  // --- Derived signals (one source of truth for triggers) ------------------
  const wantsRag =
    hasAny(caps, ['retrieval-augmented', 'citation']) ||
    hasAny(uc, ['rag', 'document search', 'summar'])
  const hasDocs =
    hasAny(dts, ['pdf', 'office', 'scanned']) ||
    hasAny(dss, ['document', 'knowledge', 'historical'])
  const hasNumeric =
    hasAny(dts, ['structured', 'sensor', 'time-series']) ||
    hasAny(dss, ['sensor', 'telemetry', 'structured database'])
  const wantsGenerative =
    hasAny(caps, ['text generation', 'summar', 'question answering', 'recommendation']) ||
    hasAny(uc, ['copilot', 'assistant', 'chatbot', 'decision support'])
  const wantsForecast = has(caps, 'forecast') || hasAny(uc, ['predictive', 'maintenance'])
  const wantsAnomaly =
    hasNumeric || hasAny(uc, ['predictive', 'maintenance', 'decision support'])
  const wantsThreshold =
    hasNumeric || hasAny(uc, ['decision support', 'predictive', 'industrial', 'operations'])
  const wantsAgentic =
    hasAny(caps, ['agent', 'tool calling', 'planning']) ||
    hasAny(uc, ['agentic', 'operations planning'])
  const wantsMultimodal =
    hasAny(caps, ['multimodal', 'image understanding', 'document understanding']) ||
    hasAny(uc, ['vision', 'multimodal']) ||
    hasAny(dts, ['image', 'scanned', 'diagram', 'video', 'audio'])
  const wantsRerank = has(caps, 'rerank') || wantsRag
  const wantsClassify = has(caps, 'classification') || wantsAgentic || wantsRag
  const wantsCode = has(uc, 'industrial copilot')
  const sensitive = input.dataSensitivity === 'high' || input.dataSensitivity === 'restricted'
  const compliance =
    has(sec, 'compliance') || sensitive || hasAny(outcomes, ['compliance', 'audit'])
  const safetyCritical =
    hasAny(uc, ['industrial', 'decision support', 'predictive', 'operations']) ||
    input.deploymentPreference === 'air-gapped'

  // --- Subtask archetypes (deterministic → first; model/hybrid → fallback) --
  const archetypes: Archetype[] = [
    {
      when: hasDocs || wantsRag,
      task: 'Ingest, parse, extract, chunk and enrich source documents',
      owner: 'deterministic',
      reason:
        'Parsing and chunking have checkable correct outputs over structured input — a parser is exact and reproducible.',
    },
    {
      when: hasNumeric,
      task: 'Read exact values, counts and readings from structured, sensor and time-series data',
      owner: 'deterministic',
      reason:
        'Transcription and measurement need precision; a model emits a plausible value, not the correct one.',
    },
    {
      when: wantsRag || has(caps, 'embeddings'),
      task: 'Generate embeddings and retrieve candidate passages from the vector index',
      owner: 'deterministic',
      reason: 'Embedding and nearest-neighbour search are deterministic, reproducible algorithms.',
    },
    {
      when: wantsThreshold,
      task: 'Evaluate readings against thresholds, limits and alarm conditions',
      owner: 'deterministic',
      reason:
        'Comparison against a threshold is exact logic; an operator (>, <, =) owns it, never a model.',
    },
    {
      when: wantsForecast || wantsAnomaly,
      task: 'Forecast degradation/load and detect statistical anomalies in numeric streams',
      owner: 'deterministic',
      reason:
        'A statistical/ML specialist gives calibrated, reproducible numbers; a general model does not.',
    },
    {
      when: wantsRerank,
      task: 'Rerank retrieved candidates by relevance',
      owner: 'hybrid',
      reason:
        'Deterministic retrieval supplies the candidate set; a learned reranker or model judges ordering.',
      evidence: ['The deterministic candidate set and their retrieval scores'],
      postChecks: ['Confirm every reranked item exists in the deterministic candidate set'],
      fallback:
        'Fall back to the deterministic retrieval order and flag that semantic reranking is unavailable.',
    },
    {
      when: wantsClassify,
      task: 'Classify and route incoming queries to the right workflow or knowledge source',
      owner: 'hybrid',
      reason:
        'A fixed taxonomy with clear rules is handled deterministically; the model handles only the fuzzy residue.',
      evidence: ['The rule-matched category, when a deterministic rule fires'],
      postChecks: ['Validate the chosen route against the allowed set of categories'],
      fallback:
        'Route unmatched queries to a safe default and flag low-confidence classification for review.',
    },
    {
      when: wantsMultimodal,
      task: 'Extract text, fields and measurements from images, scans and diagrams, then interpret them',
      owner: 'hybrid',
      reason:
        'OCR and classical computer vision transcribe exact text and values; the model interprets what the content means.',
      evidence: ['The OCR/CV-extracted text, fields and coordinates as authoritative values'],
      postChecks: ['Validate extracted fields against expected formats and ranges before the model uses them'],
      fallback:
        'If extraction confidence is low, route to human review rather than letting the model guess values.',
    },
    {
      when: wantsRag || has(caps, 'citation'),
      task: 'Attribute each statement to its supporting source passage',
      owner: 'hybrid',
      reason:
        'The span-to-source linkage is a deterministic lookup; the model decides which sources are worth citing.',
      evidence: ['The deterministic map of retrieved passages to source documents, sections and timestamps'],
      postChecks: ['Verify every citation resolves to a real retrieved passage; reject fabricated citations'],
      fallback: 'Suppress any answer whose citations cannot be resolved deterministically.',
    },
    {
      when: wantsAgentic,
      task: 'Select tools and plan the multi-step actions needed to fulfil a request',
      owner: 'hybrid',
      reason:
        'The model proposes the plan; deterministic tools execute it and deterministic guards authorise each action.',
      evidence: ['The registry of available tools and their typed input/output contracts'],
      postChecks: ['Validate each tool call against its schema and against action-authorisation policy before execution'],
      fallback:
        'Block any action that fails policy or schema validation; require human approval for irreversible actions.',
    },
    {
      when: wantsCode,
      task: 'Draft or modify control logic, queries or configuration (e.g. automation scripts or industrial control systems)',
      owner: 'model',
      reason:
        'Generating candidate code is a judgment task, but it must never be trusted without deterministic verification.',
      evidence: ['The current configuration/logic and the change specification'],
      postChecks: [
        'Syntax, lint and compile checks, plus simulation against expected behaviour where possible',
        'Mandatory human engineer approval',
      ],
      fallback:
        'Advisory only — generated logic is never auto-applied to live control systems; on failure it is discarded and the issue surfaced.',
    },
    {
      when:
        wantsGenerative || wantsRag || has(caps, 'recommendation') || has(caps, 'summar'),
      task: 'Synthesise recommendations, explanations and natural-language answers',
      owner: 'model',
      reason:
        'Interpretation, synthesis and judgment over open-ended input is what a model is uniquely good at.',
      evidence: [
        'Measured values and threshold results (deterministic)',
        'Forecast and anomaly outputs (deterministic)',
        'Retrieved, cited source passages (deterministic)',
      ],
      postChecks: [
        'Schema-validate the output',
        'Check every quoted figure against the measured ground-truth facts',
        'Run the vendor-neutrality / policy check',
      ],
      fallback:
        'If the model is unavailable or fails validation, present the deterministic evidence without a generated narrative and flag that no AI recommendation was produced.',
    },
    {
      when: compliance,
      task: 'Produce compliance, audit and regulatory figures and reports',
      owner: 'deterministic',
      reason:
        'Regulated outputs need reproducibility and auditability — the same input must give the same, provable answer.',
    },
  ]

  const subtasks: DelegationSubtask[] = archetypes
    .filter((a) => a.when)
    .map((a, i): DelegationSubtask => ({
      id: `t${i + 1}`,
      task: a.task,
      owner: a.owner,
      reason: a.reason,
      evidence: a.evidence,
      postChecks: a.postChecks,
      fallback: a.fallback,
    }))

  // --- Anti-patterns: where the project is about to mis-apply a model ------
  const antiPatterns: DelegationAntiPattern[] = []
  if (hasNumeric && wantsGenerative) {
    antiPatterns.push({
      risk: 'Letting the language model read or compute exact values, counts or trends directly from sensor / structured data.',
      remedy:
        'A historian, parser or operator transcribes and computes those values; the model is fed the results as ground truth.',
    })
  }
  if (wantsForecast || wantsAnomaly) {
    antiPatterns.push({
      risk: 'Asking a general language model to forecast degradation or judge whether a reading is anomalous.',
      remedy:
        'Use a deterministic statistical/ML forecaster and anomaly detector; the model only explains the result.',
    })
  }
  if (wantsThreshold) {
    antiPatterns.push({
      risk: 'Letting the model decide whether a value breaches a limit, alarm or threshold.',
      remedy:
        'Evaluate thresholds with a deterministic comparison; the model interprets a breach, it does not detect it.',
    })
  }
  if (compliance) {
    antiPatterns.push({
      risk: 'Generating compliance, safety or audit figures with a model whose output is not reproducible.',
      remedy:
        'Compute regulated figures deterministically and log inputs, version and rationale where a model is involved.',
    })
  }
  antiPatterns.push({
    risk: 'Wrapping the whole pipeline in a single model call instead of decomposing it.',
    remedy: 'Decompose into subtasks and route each to the deterministic tool or model that owns it.',
  })
  if (safetyCritical) {
    antiPatterns.push({
      risk: 'Allowing loss of the model to impair safety, control or measurement, or hiding that a downgrade occurred.',
      remedy:
        'Fail safe: deterministic safety/control/measurement continue without the model, which degrades to advisory-only with explicit notification.',
    })
  }

  return { summary: buildSummary(subtasks, antiPatterns.length), subtasks, antiPatterns }
}

function buildSummary(subtasks: DelegationSubtask[], antiPatternCount: number): string {
  const count = (owner: DelegationOwner) => subtasks.filter((s) => s.owner === owner).length
  const det = count('deterministic')
  const mod = count('model')
  const hyb = count('hybrid')
  return (
    `This plan decomposes the solution into ${subtasks.length} subtasks: ${det} owned by deterministic ` +
    `components (transcription, measurement, comparison, retrieval), ${mod} by the model (interpretation, ` +
    `synthesis, judgment) and ${hyb} hybrid. Deterministic tools supply ground-truth facts; the model ` +
    `interprets them and its output is validated against those facts. ${antiPatternCount} anti-pattern` +
    `${antiPatternCount === 1 ? ' is' : 's are'} flagged where a model would otherwise be mis-applied.`
  )
}
