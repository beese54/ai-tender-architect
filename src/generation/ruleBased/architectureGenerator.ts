import type { ProjectInput } from '@/types/project'
import type { ArchitectureEdge, ArchitectureNode, GeneratedArchitecture } from '@/types/architecture'
import { LAYERS, type LayerId } from '@/constants/layers'

/** Case-insensitive "does any selected value contain this needle". */
const has = (values: string[], needle: string): boolean =>
  values.some((v) => v.toLowerCase().includes(needle.toLowerCase()))

/** Look up a candidate node's label/description/group from the layer catalog. */
function candidate(layerId: LayerId, nodeId: string) {
  const layer = LAYERS.find((l) => l.id === layerId)
  const node = layer?.nodes.find((n) => n.id === nodeId)
  if (!layer || !node) {
    throw new Error(`Unknown architecture node: ${layerId}/${nodeId}`)
  }
  return { layerLabel: layer.label, label: node.label, description: node.description }
}

class ArchitectureBuilder {
  private nodes = new Map<string, ArchitectureNode>()
  private edges: ArchitectureEdge[] = []

  /** Add (or upgrade to required) a node by its catalog id. */
  add(layerId: LayerId, nodeId: string, required = true): void {
    const existing = this.nodes.get(nodeId)
    if (existing) {
      if (required) existing.required = true
      return
    }
    const c = candidate(layerId, nodeId)
    this.nodes.set(nodeId, {
      id: nodeId,
      label: c.label,
      group: c.layerLabel,
      description: c.description,
      required,
    })
  }

  has(nodeId: string): boolean {
    return this.nodes.has(nodeId)
  }

  /** Add an edge only when both endpoints exist. */
  link(source: string, target: string, label?: string): void {
    if (!this.nodes.has(source) || !this.nodes.has(target)) return
    if (this.edges.some((e) => e.source === source && e.target === target)) return
    this.edges.push({ source, target, label })
  }

  build(): { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] } {
    return { nodes: [...this.nodes.values()], edges: this.edges }
  }
}

/**
 * Deterministic, rule-based architecture generation.
 * Maps the project input to a layered, vendor-neutral node graph plus
 * assumptions and vendor lock-in risks.
 */
export function generateArchitecture(input: ProjectInput): GeneratedArchitecture {
  const b = new ArchitectureBuilder()
  const assumptions: string[] = []
  const risks: string[] = []

  const useCases = input.useCases
  const caps = input.aiCapabilities
  const strategy = input.modelStrategy
  const priorities = input.architecturePriorities
  const security = input.securityRequirements

  const wantsRag =
    has(useCases, 'rag') ||
    has(useCases, 'document') ||
    has(caps, 'retrieval-augmented') ||
    has(caps, 'citation') ||
    has(caps, 'embeddings')
  const wantsAgentic =
    has(useCases, 'agentic') ||
    has(useCases, 'operations planning') ||
    has(caps, 'agent workflows') ||
    has(caps, 'tool calling') ||
    has(caps, 'planning and reasoning')
  const wantsMultimodal =
    has(useCases, 'multimodal') ||
    has(useCases, 'computer vision') ||
    has(caps, 'multimodal') ||
    has(caps, 'image understanding')
  const selfHosted = has(strategy, 'self-hosted')
  const hosted = has(strategy, 'hosted model api') || has(strategy, 'hosted')
  const hybrid = has(strategy, 'hybrid')
  const gpu = has(strategy, 'gpu') || has(priorities, 'low latency') || has(priorities, 'high throughput')
  const vendorAgnostic =
    has(priorities, 'vendor agnostic') ||
    has(priorities, 'cloud agnostic') ||
    has(priorities, 'modular replacement') ||
    has(strategy, 'avoid vendor lock-in') ||
    has(strategy, 'switch vendors') ||
    has(strategy, 'interchangeable') ||
    has(strategy, 'model gateway')
  const highAvailability = has(priorities, 'high availability') || has(priorities, 'disaster recovery')
  const wantsSecurity = has(priorities, 'security') || has(priorities, 'auditability') || security.length > 0
  const humanInLoop =
    has(caps, 'human-in-the-loop') || has(security, 'human approval') || has(security, 'model output review')
  const privateConn = has(strategy, 'private endpoint') || has(security, 'private connectivity')
  const airGapped = input.deploymentPreference === 'air-gapped' || has(strategy, 'air-gapped')

  // --- User channels -------------------------------------------------------
  b.add('user', 'end-users')
  if (wantsSecurity) b.add('user', 'admin-users', false)
  if (humanInLoop) b.add('user', 'approvers')
  if (has(useCases, 'operations') || wantsAgentic) b.add('user', 'operations-users', false)

  // --- Application ---------------------------------------------------------
  b.add('application', 'web-app')
  if (has(useCases, 'chatbot') || has(useCases, 'copilot') || has(caps, 'question answering')) {
    b.add('application', 'chat-interface')
  }
  if (wantsAgentic) b.add('application', 'workflow-interface')
  if (wantsRag) b.add('application', 'document-upload')
  if (wantsSecurity) b.add('application', 'admin-console', false)
  if (has(useCases, 'report') || has(useCases, 'summarisation') || has(useCases, 'decision support')) {
    b.add('application', 'report-module', false)
  }

  // --- API & orchestration -------------------------------------------------
  b.add('api', 'application-api')
  if (wantsAgentic) {
    b.add('api', 'agent-orchestration')
    b.add('api', 'tool-execution')
    b.add('api', 'tool-registry')
  } else {
    b.add('api', 'workflow-orchestration', false)
  }
  if (input.dataSources.length > 0 || has(useCases, 'integration')) {
    b.add('api', 'integration-adapter')
  }

  // --- Retrieval & knowledge ----------------------------------------------
  if (wantsRag) {
    b.add('retrieval', 'document-ingestion')
    b.add('retrieval', 'parsing-extraction')
    b.add('retrieval', 'chunking-metadata')
    b.add('retrieval', 'embedding-generation')
    b.add('retrieval', 'hybrid-retrieval')
    b.add('retrieval', 'reranking', has(caps, 'reranking') || true)
    if (has(caps, 'citation') || has(caps, 'audit') || wantsSecurity) {
      b.add('retrieval', 'citation-grounding')
    }
    b.add('retrieval', 'knowledge-store', false)
    if (!has(caps, 'citation')) {
      assumptions.push(
        'Assumed citation and source grounding is required for trustworthy retrieval-augmented answers.',
      )
    }
  }

  // --- Model abstraction ---------------------------------------------------
  // A model gateway is always included when vendor agnosticism, hybrid serving,
  // or multiple providers are in play — this is the key anti-lock-in control.
  const wantsGateway = vendorAgnostic || hybrid || has(strategy, 'multiple') || has(strategy, 'routing')
  if (wantsGateway || hosted || selfHosted) {
    b.add('model-abstraction', 'model-gateway')
    b.add('model-abstraction', 'provider-adapter')
    b.add('model-abstraction', 'prompt-template', false)
  }
  if (has(strategy, 'routing') || hybrid) b.add('model-abstraction', 'model-routing')
  if (has(strategy, 'fallback') || highAvailability || hybrid) b.add('model-abstraction', 'fallback-policy')
  if (has(security, 'policy guardrails') || has(security, 'content safety') || wantsSecurity) {
    b.add('model-abstraction', 'guardrail-service', false)
  }

  // --- Model serving -------------------------------------------------------
  if (hosted || hybrid || (!selfHosted && !hosted)) {
    b.add('model-serving', 'hosted-model-endpoint', hosted || hybrid)
    if (!hosted && !hybrid && !selfHosted) {
      assumptions.push('No serving strategy was specified; assumed a hosted model endpoint behind the gateway.')
    }
  }
  if (selfHosted || hybrid) b.add('model-serving', 'self-hosted-model-endpoint')
  if (wantsRag) b.add('model-serving', 'embedding-model-endpoint')
  if (wantsRag && (has(caps, 'reranking') || true)) b.add('model-serving', 'reranking-model-endpoint', false)
  if (wantsMultimodal) b.add('model-serving', 'multimodal-model-endpoint')
  if (gpu && (selfHosted || hybrid)) b.add('model-serving', 'gpu-inference')
  if (has(caps, 'forecasting') || has(useCases, 'predictive')) b.add('model-serving', 'batch-inference', false)

  // --- Compute & infrastructure -------------------------------------------
  b.add('compute', 'container-runtime', false)
  if (selfHosted || hybrid) b.add('compute', 'compute-cluster')
  if (gpu && (selfHosted || hybrid)) b.add('compute', 'gpu-node-pool')
  if (has(strategy, 'cpu-only') || selfHosted) b.add('compute', 'cpu-node-pool', false)
  if (highAvailability) b.add('compute', 'load-balancer')
  if (privateConn) b.add('compute', 'private-endpoint')
  b.add('compute', 'secrets-manager', wantsSecurity)
  if (wantsSecurity || airGapped) b.add('compute', 'network-boundary', false)

  // --- Data storage --------------------------------------------------------
  if (wantsRag) b.add('data', 'vector-store')
  b.add('data', 'relational-db', false)
  if (wantsRag || has(input.dataTypes, 'pdf') || input.dataTypes.length > 0) b.add('data', 'object-storage')
  if (wantsRag) b.add('data', 'metadata-store', false)
  if (has(security, 'audit') || wantsSecurity) b.add('data', 'audit-log-store')
  if (has(security, 'prompt and response') || has(caps, 'evaluation')) b.add('data', 'prompt-log-store', false)
  if (has(caps, 'evaluation') || has(caps, 'benchmarking')) b.add('data', 'eval-dataset-store', false)

  // --- Security & governance ----------------------------------------------
  if (has(security, 'identity') || wantsSecurity) b.add('security', 'identity-provider')
  if (has(security, 'role-based') || wantsSecurity) b.add('security', 'rbac')
  if (has(security, 'encryption') || wantsSecurity) b.add('security', 'encryption')
  if (has(security, 'audit') || wantsSecurity) b.add('security', 'audit-logging')
  if (has(security, 'policy guardrails') || has(security, 'content safety')) b.add('security', 'policy-enforcement', false)
  if (has(security, 'sensitive data') || input.dataSensitivity === 'restricted') b.add('security', 'dlp', false)
  if (humanInLoop) b.add('security', 'human-approval')
  if (has(security, 'content safety') || has(security, 'policy guardrails')) b.add('security', 'safety-guardrails', false)

  // --- Observability & evaluation -----------------------------------------
  b.add('observability', 'app-monitoring')
  b.add('observability', 'infra-monitoring', false)
  b.add('observability', 'model-monitoring')
  if (wantsRag) b.add('observability', 'retrieval-eval', false)
  if (has(caps, 'citation') || wantsRag) b.add('observability', 'hallucination-eval', false)
  b.add('observability', 'latency-throughput-monitoring', false)
  if (has(priorities, 'cost')) b.add('observability', 'cost-monitoring', false)
  if (has(caps, 'human-in-the-loop') || has(caps, 'confidence')) b.add('observability', 'feedback-collection', false)

  // --- Integration ---------------------------------------------------------
  if (has(input.dataSources, 'internal systems')) b.add('integration', 'enterprise-systems')
  if (has(input.dataSources, 'api')) b.add('integration', 'external-apis')
  if (has(input.dataSources, 'document') || has(input.dataSources, 'knowledge')) b.add('integration', 'document-repositories', false)
  if (has(input.dataSources, 'email') || has(input.dataSources, 'messaging')) b.add('integration', 'notification-systems', false)
  if (has(input.dataSources, 'sensor') || has(input.dataSources, 'telemetry')) b.add('integration', 'sensor-systems')
  if (has(input.dataSources, 'database')) b.add('integration', 'data-platforms', false)
  if (has(input.dataSources, 'external public')) b.add('integration', 'external-data-sources', false)
  if (has(useCases, 'ticket') || has(useCases, 'operations')) b.add('integration', 'ticketing-systems', false)

  // --- Operations & lifecycle ---------------------------------------------
  if (selfHosted || hybrid) {
    b.add('operations', 'model-registry')
    b.add('operations', 'deployment-pipeline')
  }
  if (highAvailability) {
    b.add('operations', 'backup-restore')
    b.add('operations', 'disaster-recovery')
  }
  b.add('operations', 'lifecycle-management', false)
  if (input.tenderPreferences.includeSupportRequirements) b.add('operations', 'support-desk', false)

  // --- Edges (data-flow spine + key governance links) ----------------------
  b.link('end-users', 'chat-interface')
  b.link('end-users', 'web-app')
  b.link('approvers', 'human-approval')
  b.link('operations-users', 'workflow-interface')
  b.link('admin-users', 'admin-console')
  b.link('chat-interface', 'application-api')
  b.link('web-app', 'application-api')
  b.link('workflow-interface', 'application-api')
  b.link('document-upload', 'document-ingestion')

  b.link('application-api', 'agent-orchestration')
  b.link('application-api', 'workflow-orchestration')
  b.link('application-api', 'hybrid-retrieval', 'query')
  b.link('application-api', 'model-gateway')
  b.link('agent-orchestration', 'tool-execution')
  b.link('tool-execution', 'tool-registry')
  b.link('agent-orchestration', 'human-approval')
  b.link('agent-orchestration', 'model-gateway')
  b.link('workflow-orchestration', 'model-gateway')
  b.link('integration-adapter', 'enterprise-systems')
  b.link('integration-adapter', 'external-apis')

  // Retrieval pipeline
  b.link('document-ingestion', 'parsing-extraction')
  b.link('parsing-extraction', 'chunking-metadata')
  b.link('chunking-metadata', 'embedding-generation')
  b.link('embedding-generation', 'embedding-model-endpoint')
  b.link('embedding-generation', 'vector-store')
  b.link('hybrid-retrieval', 'vector-store')
  b.link('hybrid-retrieval', 'reranking')
  b.link('reranking', 'reranking-model-endpoint')
  b.link('reranking', 'citation-grounding')
  b.link('citation-grounding', 'model-gateway', 'context')

  // Model abstraction → serving
  b.link('model-gateway', 'model-routing')
  b.link('model-gateway', 'fallback-policy')
  b.link('model-gateway', 'guardrail-service')
  b.link('model-gateway', 'provider-adapter')
  b.link('provider-adapter', 'hosted-model-endpoint')
  b.link('provider-adapter', 'self-hosted-model-endpoint')
  b.link('provider-adapter', 'multimodal-model-endpoint')
  b.link('model-routing', 'hosted-model-endpoint')
  b.link('model-routing', 'self-hosted-model-endpoint')
  b.link('self-hosted-model-endpoint', 'gpu-inference')
  b.link('gpu-inference', 'gpu-node-pool')
  b.link('self-hosted-model-endpoint', 'compute-cluster')

  // Security & governance
  b.link('identity-provider', 'application-api')
  b.link('rbac', 'application-api')
  b.link('model-gateway', 'secrets-manager')
  b.link('audit-logging', 'audit-log-store')

  // Observability
  b.link('model-gateway', 'model-monitoring')
  b.link('hybrid-retrieval', 'retrieval-eval')
  b.link('application-api', 'app-monitoring')

  // --- Assumptions & risks -------------------------------------------------
  if (input.deploymentPreference === 'not-specified') {
    assumptions.push('Deployment environment was not specified; the design supports cloud, on-premises or hybrid.')
  }
  if (!wantsGateway && (hosted || selfHosted)) {
    assumptions.push('A model gateway was added to keep the application decoupled from any single model provider.')
  }
  if (input.dataSensitivity === 'not-specified') {
    assumptions.push('Data sensitivity was not specified; standard encryption and access controls are assumed.')
  }

  if (!b.has('model-gateway')) {
    risks.push('Without a model gateway/abstraction layer, the application risks tight coupling to a single model provider.')
  }
  if (hosted && !privateConn) {
    risks.push('Hosted model endpoints without private connectivity may expose data to external networks; consider private endpoints and data classification routing.')
  }
  if (!has(strategy, 'avoid vendor lock-in') && !vendorAgnostic) {
    risks.push('Vendor-agnostic design was not prioritised; future migration between providers may require application changes.')
  }
  if (selfHosted && !gpu) {
    risks.push('Self-hosted serving without accelerator-backed inference may not meet latency/throughput targets for larger models.')
  }
  if (!b.has('vector-store') && wantsRag) {
    risks.push('Retrieval is required but no vector store was included; retrieval quality may be limited.')
  }
  risks.push('Proprietary data formats or undocumented interfaces in any component would undermine portability; require open, documented interfaces and exportable data.')

  const { nodes, edges } = b.build()

  return {
    title: input.projectTitle ? `${input.projectTitle} — Reference Architecture` : 'Reference Architecture',
    viewType: 'logical',
    nodes,
    edges,
    assumptions,
    risks,
  }
}
