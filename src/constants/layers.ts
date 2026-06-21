/**
 * The 12 architecture layers and their canonical, vendor-neutral nodes.
 * Single source of truth feeding the architecture generator, the diagram
 * layout, and the per-layer tender coverage clauses.
 */

export type LayerId =
  | 'user'
  | 'application'
  | 'api'
  | 'retrieval'
  | 'model-abstraction'
  | 'model-serving'
  | 'compute'
  | 'data'
  | 'security'
  | 'observability'
  | 'integration'
  | 'operations'

export interface CandidateNode {
  id: string
  label: string
  description: string
}

export interface Layer {
  id: LayerId
  /** Display label; also used as `group` on generated nodes. */
  label: string
  /** Accent colour (hex) for the node header and diagram lane. */
  accent: string
  /** Left-to-right ordering of the layer lane in the diagram. */
  order: number
  nodes: CandidateNode[]
}

export const LAYERS: Layer[] = [
  {
    id: 'user',
    label: 'User Channels',
    accent: '#6366f1',
    order: 0,
    nodes: [
      { id: 'end-users', label: 'End Users', description: 'Primary users interacting with the system' },
      { id: 'admin-users', label: 'Admin Users', description: 'Administrators managing configuration and content' },
      { id: 'approvers', label: 'Approvers', description: 'Users who review and approve AI outputs or actions' },
      { id: 'operations-users', label: 'Operations Users', description: 'Operational staff monitoring and running the system' },
      { id: 'external-users', label: 'External Users', description: 'External or partner users, where applicable' },
    ],
  },
  {
    id: 'application',
    label: 'Application Layer',
    accent: '#0ea5e9',
    order: 1,
    nodes: [
      { id: 'web-app', label: 'Web Application', description: 'Primary web front end' },
      { id: 'chat-interface', label: 'Chat Interface', description: 'Conversational interface for queries' },
      { id: 'workflow-interface', label: 'Workflow Interface', description: 'UI for multi-step / agentic workflows' },
      { id: 'document-upload', label: 'Document Upload Interface', description: 'Ingestion entry point for documents' },
      { id: 'admin-console', label: 'Admin Console', description: 'Configuration, users, and content management' },
      { id: 'report-module', label: 'Report Generation Module', description: 'Generates reports and exports' },
    ],
  },
  {
    id: 'api',
    label: 'API & Orchestration Layer',
    accent: '#06b6d4',
    order: 2,
    nodes: [
      { id: 'application-api', label: 'Application API', description: 'Secure API surface for the application' },
      { id: 'workflow-orchestration', label: 'Workflow Orchestration Service', description: 'Coordinates multi-step processes' },
      { id: 'agent-orchestration', label: 'Agent Orchestration Service', description: 'Plans and runs agentic task graphs' },
      { id: 'tool-execution', label: 'Tool Execution Service', description: 'Executes registered tools / functions' },
      { id: 'tool-registry', label: 'Tool Registry', description: 'Catalogue of callable tools and schemas' },
      { id: 'integration-adapter', label: 'Integration Adapter Service', description: 'Adapters to external systems' },
    ],
  },
  {
    id: 'retrieval',
    label: 'Retrieval & Knowledge Layer',
    accent: '#14b8a6',
    order: 3,
    nodes: [
      { id: 'document-ingestion', label: 'Document Ingestion Pipeline', description: 'Ingests source documents and data' },
      { id: 'parsing-extraction', label: 'Parsing & Extraction Service', description: 'Extracts text and structure from sources' },
      { id: 'chunking-metadata', label: 'Chunking & Metadata Service', description: 'Splits content and attaches metadata' },
      { id: 'embedding-generation', label: 'Embedding Generation Service', description: 'Generates vector embeddings' },
      { id: 'hybrid-retrieval', label: 'Hybrid Retrieval Service', description: 'Combines keyword and vector retrieval' },
      { id: 'reranking', label: 'Reranking Service', description: 'Re-orders retrieved candidates by relevance' },
      { id: 'citation-grounding', label: 'Citation & Source Grounding Service', description: 'Attributes answers to source passages' },
      { id: 'knowledge-store', label: 'Knowledge Store', description: 'Curated knowledge base' },
    ],
  },
  {
    id: 'model-abstraction',
    label: 'Model Abstraction Layer',
    accent: '#8b5cf6',
    order: 4,
    nodes: [
      { id: 'model-gateway', label: 'Model Gateway', description: 'Decouples application logic from model providers' },
      { id: 'provider-adapter', label: 'Provider Adapter Interface', description: 'Standard interface to hosted/self-hosted endpoints' },
      { id: 'model-routing', label: 'Model Routing Policy', description: 'Routes requests across providers/models' },
      { id: 'fallback-policy', label: 'Fallback Model Policy', description: 'Fails over to alternative endpoints' },
      { id: 'prompt-template', label: 'Prompt Template Manager', description: 'Versioned prompt templates' },
      { id: 'guardrail-service', label: 'Guardrail Service', description: 'Input/output policy and safety guardrails' },
    ],
  },
  {
    id: 'model-serving',
    label: 'Model Serving Layer',
    accent: '#ec4899',
    order: 5,
    nodes: [
      { id: 'hosted-model-endpoint', label: 'Hosted Model Endpoint', description: 'Externally hosted generation model' },
      { id: 'self-hosted-model-endpoint', label: 'Self-Hosted Model Endpoint', description: 'Internally hosted generation model' },
      { id: 'embedding-model-endpoint', label: 'Embedding Model Endpoint', description: 'Serves embedding models' },
      { id: 'reranking-model-endpoint', label: 'Reranking Model Endpoint', description: 'Serves reranking models' },
      { id: 'multimodal-model-endpoint', label: 'Multimodal Model Endpoint', description: 'Serves vision/multimodal models' },
      { id: 'gpu-inference', label: 'GPU-Backed Inference Service', description: 'Accelerator-backed inference' },
      { id: 'batch-inference', label: 'Batch Inference Service', description: 'Asynchronous batch inference' },
    ],
  },
  {
    id: 'compute',
    label: 'Compute & Infrastructure Layer',
    accent: '#f97316',
    order: 6,
    nodes: [
      { id: 'container-runtime', label: 'Container Runtime', description: 'Runs containerised services' },
      { id: 'compute-cluster', label: 'Compute Cluster', description: 'Orchestrated compute resources' },
      { id: 'gpu-node-pool', label: 'GPU Node Pool', description: 'Accelerator compute pool' },
      { id: 'cpu-node-pool', label: 'CPU Node Pool', description: 'General-purpose compute pool' },
      { id: 'storage-service', label: 'Storage Service', description: 'Block/file storage for workloads' },
      { id: 'network-boundary', label: 'Network Boundary', description: 'Segmented network perimeter' },
      { id: 'load-balancer', label: 'Load Balancer', description: 'Distributes traffic across replicas' },
      { id: 'private-endpoint', label: 'Private Endpoint', description: 'Private connectivity to services' },
      { id: 'secrets-manager', label: 'Secrets Manager', description: 'Secure storage of credentials/keys' },
    ],
  },
  {
    id: 'data',
    label: 'Data Storage Layer',
    accent: '#eab308',
    order: 7,
    nodes: [
      { id: 'vector-store', label: 'Vector Database / Index', description: 'Stores and searches embeddings' },
      { id: 'relational-db', label: 'Relational Database', description: 'Structured application data' },
      { id: 'object-storage', label: 'Object Storage', description: 'Documents and large binary objects' },
      { id: 'metadata-store', label: 'Metadata Store', description: 'Document and chunk metadata' },
      { id: 'audit-log-store', label: 'Audit Log Store', description: 'Immutable audit records' },
      { id: 'eval-dataset-store', label: 'Evaluation Dataset Store', description: 'Test/eval datasets' },
      { id: 'prompt-log-store', label: 'Prompt & Response Log Store', description: 'Logged prompts and responses' },
    ],
  },
  {
    id: 'security',
    label: 'Security & Governance Layer',
    accent: '#ef4444',
    order: 8,
    nodes: [
      { id: 'identity-provider', label: 'Identity Provider', description: 'Authentication and identity federation' },
      { id: 'rbac', label: 'Role-Based Access Control', description: 'Authorisation by role' },
      { id: 'policy-enforcement', label: 'Policy Enforcement', description: 'Enforces access and usage policies' },
      { id: 'dlp', label: 'Data Loss Prevention', description: 'Prevents leakage of sensitive data' },
      { id: 'encryption', label: 'Encryption', description: 'Encryption at rest and in transit' },
      { id: 'audit-logging', label: 'Audit Logging', description: 'Records security-relevant events' },
      { id: 'human-approval', label: 'Human Approval Workflow', description: 'Human-in-the-loop gating' },
      { id: 'safety-guardrails', label: 'Model Safety Guardrails', description: 'Content safety controls' },
    ],
  },
  {
    id: 'observability',
    label: 'Observability & Evaluation Layer',
    accent: '#10b981',
    order: 9,
    nodes: [
      { id: 'app-monitoring', label: 'Application Monitoring', description: 'Application health and errors' },
      { id: 'infra-monitoring', label: 'Infrastructure Monitoring', description: 'Compute, storage and network metrics' },
      { id: 'model-monitoring', label: 'Model Performance Monitoring', description: 'Quality and drift of model outputs' },
      { id: 'retrieval-eval', label: 'Retrieval Evaluation', description: 'Retrieval quality measurement' },
      { id: 'hallucination-eval', label: 'Hallucination Evaluation', description: 'Groundedness / hallucination checks' },
      { id: 'latency-throughput-monitoring', label: 'Latency & Throughput Monitoring', description: 'Performance telemetry' },
      { id: 'cost-monitoring', label: 'Cost Monitoring', description: 'Operational cost tracking' },
      { id: 'feedback-collection', label: 'Feedback Collection', description: 'User feedback capture' },
    ],
  },
  {
    id: 'integration',
    label: 'Integration Layer',
    accent: '#64748b',
    order: 10,
    nodes: [
      { id: 'enterprise-systems', label: 'Enterprise Systems', description: 'Core line-of-business systems' },
      { id: 'external-apis', label: 'External APIs', description: 'Third-party and partner APIs' },
      { id: 'document-repositories', label: 'Document Repositories', description: 'Content and records repositories' },
      { id: 'ticketing-systems', label: 'Ticketing Systems', description: 'Service / case management' },
      { id: 'notification-systems', label: 'Notification Systems', description: 'Email, messaging, alerts' },
      { id: 'data-platforms', label: 'Data Platforms', description: 'Data warehouses / lakes' },
      { id: 'sensor-systems', label: 'Sensor Systems', description: 'Telemetry and sensor feeds' },
      { id: 'external-data-sources', label: 'External Data Sources', description: 'Public / external datasets' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations & Lifecycle Layer',
    accent: '#0f766e',
    order: 11,
    nodes: [
      { id: 'model-registry', label: 'Model Registry', description: 'Versioned registry of models' },
      { id: 'deployment-pipeline', label: 'Model Deployment Pipeline', description: 'CI/CD for models and services' },
      { id: 'backup-restore', label: 'Backup & Restore', description: 'Backup of config, data and indexes' },
      { id: 'disaster-recovery', label: 'Disaster Recovery', description: 'Failover and recovery procedures' },
      { id: 'support-desk', label: 'Support & Service Desk', description: 'Operational support function' },
      { id: 'lifecycle-management', label: 'Lifecycle Management', description: 'Patching, upgrades and decommissioning' },
    ],
  },
]

export const LAYER_BY_ID: Record<LayerId, Layer> = LAYERS.reduce(
  (acc, layer) => {
    acc[layer.id] = layer
    return acc
  },
  {} as Record<LayerId, Layer>,
)

/** Look up the accent colour for a node's `group` (layer label). */
export const accentForGroup = (group: string): string =>
  LAYERS.find((l) => l.label === group)?.accent ?? '#64748b'

/** Look up the lane order for a node's `group` (layer label). */
export const orderForGroup = (group: string): number =>
  LAYERS.find((l) => l.label === group)?.order ?? 99
