import type { ProjectInput } from '@/types/project'
import { deriveTargets } from './derivePerformanceTargets'

/**
 * Derives the technical configuration (AI capabilities, model/serving strategy,
 * architecture priorities and security requirements) from the user's high-level
 * project intake. This lets users fill in only the Project Intake while the rest
 * is inferred automatically.
 *
 * Inference only fills fields the user left empty, so fully-specified inputs
 * (e.g. presets) pass through unchanged.
 */
export function inferConfiguration(input: ProjectInput): ProjectInput {
  const uc = input.useCases.map((u) => u.toLowerCase())
  const dt = input.dataTypes.map((d) => d.toLowerCase())
  const ds = input.dataSources.map((d) => d.toLowerCase())
  const stage = input.projectStage
  const sensitivity = input.dataSensitivity
  const deployment = input.deploymentPreference

  const hasUC = (needle: string) => uc.some((u) => u.includes(needle))
  const hasDT = (needle: string) => dt.some((d) => d.includes(needle))
  const hasDS = (needle: string) => ds.some((d) => d.includes(needle))
  const sensitive = sensitivity === 'high' || sensitivity === 'restricted'
  const isolated = deployment === 'on-premises' || deployment === 'air-gapped'

  const wantsRag =
    hasUC('rag') ||
    hasUC('document') ||
    hasUC('search') ||
    hasUC('summar') ||
    hasUC('decision support') ||
    hasUC('copilot') ||
    hasUC('tender drafting') ||
    hasDS('document') ||
    hasDS('knowledge') ||
    hasDT('pdf') ||
    hasDT('office')
  const wantsAgentic = hasUC('agentic') || hasUC('operations') || hasUC('copilot')
  const wantsMultimodal =
    hasUC('multimodal') ||
    hasUC('vision') ||
    hasDT('image') ||
    hasDT('scan') ||
    hasDT('diagram') ||
    hasDT('video')

  // --- AI capabilities -----------------------------------------------------
  const caps = new Set<string>()
  if (wantsRag) {
    ;['Retrieval-augmented generation', 'Question answering', 'Summarisation', 'Citation-grounded answers', 'Embeddings', 'Reranking'].forEach((c) => caps.add(c))
  }
  if (hasUC('chatbot') || hasUC('copilot') || hasUC('assistant')) caps.add('Question answering')
  if (hasUC('summar') || hasUC('document')) caps.add('Document understanding')
  if (wantsAgentic) {
    ;['Agent workflows', 'Tool calling', 'Planning and reasoning'].forEach((c) => caps.add(c))
  }
  if (wantsMultimodal) {
    ;['Multimodal input', 'Image understanding', 'Document understanding', 'Classification'].forEach((c) => caps.add(c))
  }
  if (hasUC('tender drafting')) {
    ;['Text generation', 'Structured JSON output'].forEach((c) => caps.add(c))
  }
  if (hasUC('predictive') || hasUC('maintenance')) {
    ;['Forecasting', 'Classification', 'Confidence scoring'].forEach((c) => caps.add(c))
  }
  if (hasUC('decision support')) {
    ;['Planning and reasoning', 'Confidence scoring'].forEach((c) => caps.add(c))
  }
  if (hasUC('model-serving') || hasUC('serving')) {
    ;['Text generation', 'Embeddings', 'Reranking', 'Evaluation and benchmarking'].forEach((c) => caps.add(c))
  }
  if (hasUC('governance') || hasUC('evaluation')) {
    ;['Evaluation and benchmarking', 'Audit trails'].forEach((c) => caps.add(c))
  }
  // Baselines that suit virtually all enterprise/government use cases.
  caps.add('Text generation')
  caps.add('Audit trails')
  if (wantsAgentic || sensitive) caps.add('Human-in-the-loop review')

  // --- Model & serving strategy -------------------------------------------
  const strategy = new Set<string>()
  strategy.add('Model gateway required')
  strategy.add('Need to avoid vendor lock-in')
  strategy.add('Multiple interchangeable model providers')
  if (wantsRag) strategy.add('Separate embedding, reranking, and generation models')
  if (isolated || sensitivity === 'restricted') {
    strategy.add('Self-hosted model')
    strategy.add('Private endpoint')
    if (deployment === 'air-gapped') strategy.add('Air-gapped or isolated environment')
  } else if (deployment === 'cloud') {
    strategy.add('Hosted model API')
  } else {
    // hybrid or not-specified
    strategy.add('Hybrid hosted and self-hosted')
    strategy.add('Fallback model required')
  }
  if (hasUC('model-serving') || hasUC('serving')) {
    ;['Self-hosted model', 'GPU-backed serving', 'CPU-only fallback', 'Routing across multiple model providers'].forEach((s) => strategy.add(s))
  }
  if (stage === 'production' || stage === 'enterprise') strategy.add('Fallback model required')

  // --- Architecture priorities --------------------------------------------
  const priorities = new Set<string>()
  ;['Vendor agnostic', 'Modular replacement of components', 'Interoperability', 'Scalability'].forEach((p) => priorities.add(p))
  if (sensitive) {
    ;['Security', 'Auditability', 'Data sovereignty'].forEach((p) => priorities.add(p))
  }
  if (isolated) {
    priorities.add('On-premises deployment')
    priorities.add('Data sovereignty')
  } else if (deployment === 'hybrid') {
    priorities.add('Hybrid deployment')
  } else if (deployment === 'cloud') {
    priorities.add('Cloud agnostic')
  }
  if (stage === 'production' || stage === 'enterprise') {
    ;['High availability', 'Disaster recovery'].forEach((p) => priorities.add(p))
  }
  if (hasUC('model-serving') || hasUC('serving')) {
    ;['Low latency', 'High throughput', 'Open source preference'].forEach((p) => priorities.add(p))
  }
  if (wantsAgentic) priorities.add('Auditability')

  // --- Security requirements ----------------------------------------------
  const security = new Set<string>()
  ;['Identity and access management', 'Role-based access control', 'Data encryption at rest', 'Data encryption in transit', 'Audit logging'].forEach((s) => security.add(s))
  if (wantsRag) security.add('Prompt and response logging')
  if (sensitive) {
    ;['Sensitive data handling', 'Network segmentation', 'Private connectivity', 'Data retention controls', 'Secret management'].forEach((s) => security.add(s))
  }
  if (wantsAgentic) {
    ;['Human approval workflow', 'Policy guardrails'].forEach((s) => security.add(s))
  }
  if (hasUC('governance') || hasUC('evaluation')) security.add('Model output review')

  // Derive performance targets the user is no longer asked to fill.
  const targets = deriveTargets(input.performanceRequirements, input.projectStage)

  // Fill only empty fields so explicit/preset values are preserved.
  return {
    ...input,
    aiCapabilities: input.aiCapabilities.length ? input.aiCapabilities : [...caps],
    modelStrategy: input.modelStrategy.length ? input.modelStrategy : [...strategy],
    architecturePriorities: input.architecturePriorities.length ? input.architecturePriorities : [...priorities],
    securityRequirements: input.securityRequirements.length ? input.securityRequirements : [...security],
    performanceRequirements: {
      ...input.performanceRequirements,
      latencyTarget: targets.latencyTarget,
      availabilityTarget: targets.availabilityTarget,
      throughputTarget: targets.throughputTarget,
    },
    tenderPreferences: {
      // The tender is always technical, procurement-ready and detailed.
      ...input.tenderPreferences,
      tone: 'procurement-ready',
      length: 'detailed',
    },
  }
}
