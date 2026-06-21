import type { ProjectInput } from '@/types/project'
import type { GeneratedArchitecture } from '@/types/architecture'
import type {
  ClauseLevel,
  GeneratedTender,
  TenderClause,
  TenderSection,
} from '@/types/tender'
import { generateDelegationPlan } from './delegationPlanGenerator'

const has = (values: string[], needle: string): boolean =>
  values.some((v) => v.toLowerCase().includes(needle.toLowerCase()))

/**
 * Deterministic, vendor-neutral tender specification generator.
 * Produces formal procurement language with `shall` / `should` clauses, strong
 * vendor lock-in prevention clauses, and sections gated by tender preferences.
 */
export function generateTender(
  input: ProjectInput,
  architecture: GeneratedArchitecture,
): GeneratedTender {
  const prefs = input.tenderPreferences
  const concise = prefs.length === 'short'

  let counter = 0
  const clause = (level: ClauseLevel, text: string): TenderClause => ({
    id: `c${++counter}`,
    level,
    text,
  })

  // Keep clauses whose level is enabled, and drop "should" clauses when concise.
  const keep = (level: ClauseLevel): boolean => {
    if (level === 'shall') return prefs.includeMandatory
    if (concise) return false
    return prefs.includeOptional
  }

  const sections: TenderSection[] = []
  const section = (heading: string, clauses: TenderClause[], intro?: string): void => {
    const filtered = clauses.filter((c) => keep(c.level))
    if (filtered.length === 0) return
    sections.push({ heading, intro, clauses: filtered })
  }

  const org = input.organisation || 'the Authority'
  const wantsRag =
    has(input.useCases, 'rag') ||
    has(input.useCases, 'document') ||
    has(input.aiCapabilities, 'retrieval-augmented') ||
    has(input.aiCapabilities, 'citation')
  const wantsAgentic =
    has(input.useCases, 'agentic') ||
    has(input.aiCapabilities, 'agent workflows') ||
    has(input.aiCapabilities, 'tool calling')
  const humanInLoop =
    has(input.aiCapabilities, 'human-in-the-loop') ||
    has(input.securityRequirements, 'human approval') ||
    has(input.securityRequirements, 'model output review')

  // 1. Project Background
  section('Project Background', [
    clause(
      'shall',
      `${org} requires a modular, vendor-neutral artificial intelligence solution. ${
        input.background || 'The solution shall address the stated business need while avoiding dependence on any single vendor or proprietary platform.'
      }`,
    ),
    input.problemStatement
      ? clause('shall', `The solution shall address the following problem: ${input.problemStatement}`)
      : clause('should', 'The solution should clearly address the operational problem identified by the Authority.'),
  ])

  // 2. Objectives
  section(
    'Objectives',
    [
      clause(
        'shall',
        'The Contractor shall design, implement, test and document a modular AI application architecture in which the application, retrieval, model gateway, model-serving, data storage, observability and integration layers are independently replaceable.',
      ),
      ...(input.businessOutcomes.length
        ? [clause('shall', `The solution shall support the following business outcomes: ${input.businessOutcomes.join('; ')}.`)]
        : []),
      clause('should', 'The solution should minimise total cost of ownership and operational complexity over its lifecycle.'),
    ],
  )

  // 3. Scope of Work
  section('Scope of Work', [
    clause(
      'shall',
      `The scope of work shall include the design, build, configuration, testing, documentation and handover of the solution as a ${stageLabel(
        input.projectStage,
      )}.`,
    ),
    ...(input.useCases.length
      ? [clause('shall', `The solution shall support the following use cases: ${[...input.useCases, input.customUseCase].filter(Boolean).join('; ')}.`)]
      : []),
    clause('should', 'The Contractor should propose phased delivery with clearly defined milestones and acceptance gates.'),
  ])

  // 4. Functional Requirements
  section('Functional Requirements', [
    clause('shall', 'The solution shall provide user-facing interfaces appropriate to the use case, such as chat, search, workflow, document upload, reporting or administrative interfaces.'),
    ...(input.aiCapabilities.length
      ? [clause('shall', `The solution shall provide the following AI capabilities: ${input.aiCapabilities.join('; ')}.`)]
      : []),
    ...(has(input.aiCapabilities, 'structured json')
      ? [clause('shall', 'The solution shall support structured, schema-validated output (for example JSON) for downstream integration.')]
      : []),
    clause('should', 'The solution should provide confidence indicators and clear handling of low-confidence or out-of-scope queries.'),
  ])

  // 5. Architecture Requirements
  section(
    'Architecture Requirements',
    [
      clause('shall', 'The solution shall adopt a layered architecture that separates business logic, model provider logic, retrieval logic, data storage logic and infrastructure-specific deployment logic.'),
      clause('shall', `The solution shall implement the following architecture layers, as applicable: ${[...new Set(architecture.nodes.map((n) => n.group))].join('; ')}.`),
      clause('should', 'The architecture should be documented with component diagrams, interface contracts and data-flow descriptions.'),
    ],
    'The architecture shall be modular and support independent replacement of components.',
  )

  // 6. AI Task Delegation and Deterministic Safeguards (applies the framework)
  if (prefs.includeDelegationPlan) {
    section(
      'AI Task Delegation and Deterministic Safeguards',
      [
        clause('shall', 'The solution shall decompose each AI use case into discrete subtasks and assign each subtask to a deterministic component or a model component according to whether the subtask has a checkable correct answer.'),
        clause('shall', 'The solution shall not use a generative model to perform arithmetic, comparison, threshold or limit evaluation, exact lookup, counting or measurement; such subtasks shall be performed by deterministic components.'),
        clause('shall', 'Deterministic components shall supply measured, ground-truth facts to model components as clearly labelled authoritative evidence, so that model components do not re-estimate values that have already been measured.'),
        clause('shall', 'The solution shall apply deterministic post-checks to model outputs, including schema validation, range checks and comparison of any quoted values against the corresponding measured facts.'),
        clause('shall', 'Where a deterministic component is unavailable and processing falls back to a model, the solution shall flag the degradation and lower the reported confidence; silent fallback to a model shall not occur.'),
        clause('shall', 'For regulated, safety, financial or compliance outputs, the solution shall favour deterministic, auditable computation, and shall log model inputs, model version and rationale wherever a model contributes to such an output.'),
        clause('shall', 'Loss of model availability shall not impair deterministic safety, control or measurement functions; in that event the solution shall degrade to advisory-only behaviour and explicitly notify users.'),
        clause('should', 'The solution should not cap the confidence of a reliable deterministic result below the level it merits, nor report unjustified high confidence for model outputs on tasks where models are unreliable.'),
        clause('should', 'The solution should right-size models to tasks, using smaller specialised classifiers or deterministic rules where these are sufficient rather than a large general-purpose model.'),
      ],
      'Each AI use case shall be split into subtasks routed to deterministic components (for transcription, measurement, comparison and lookup) or to model components (for interpretation and judgment), with deterministic verification of model outputs.',
    )
  }

  // 7. Vendor-Agnostic Design Requirements (lock-in prevention)
  if (prefs.includeLockInClauses) {
    section(
      'Vendor-Agnostic Design Requirements',
      [
        clause('shall', 'The solution shall not require the Authority to be locked into a single model provider, cloud provider, vector database provider, inference-serving engine, observability platform or proprietary orchestration framework.'),
        clause('shall', 'The solution shall provide a model abstraction layer that allows different hosted or self-hosted model endpoints to be configured and switched through external configuration, without requiring major changes to application logic.'),
        clause('shall', 'The solution shall allow model endpoints, API credentials, routing policies and model names to be changed through secure configuration management.'),
        clause('shall', 'The solution shall support separate configuration of generation models, embedding models, reranking models, classification models and multimodal models where applicable.'),
        clause('shall', 'The solution shall support deployment in cloud, on-premises or hybrid environments, subject to the Authority’s security, data residency and operational requirements.'),
        clause('shall', 'The solution shall use documented interfaces and portable data formats to support future migration, replacement or integration with alternative components.'),
        clause('shall', 'The solution shall provide export capability for prompts, configurations, metadata, logs, evaluation datasets and knowledge base indexes where technically feasible.'),
        clause('should', 'The solution should support fallback and failover mechanisms across model endpoints where required.'),
      ],
      'These requirements ensure the Authority retains the ability to replace components and avoid vendor lock-in.',
    )
  }

  // 7. Data Ingestion and Knowledge Management Requirements
  if (wantsRag || input.dataSources.length) {
    section('Data Ingestion and Knowledge Management Requirements', [
      clause('shall', `The solution shall ingest and manage the required data sources, including: ${(input.dataSources.length ? input.dataSources : ['the Authority’s nominated sources']).join('; ')}.`),
      ...(input.dataTypes.length
        ? [clause('shall', `The solution shall support the following data and document types: ${input.dataTypes.join('; ')}.`)]
        : []),
      clause('shall', 'The solution shall support ingestion, parsing, extraction, chunking and metadata enrichment of source content.'),
      ...(input.dataCadence === 'real-time' || input.dataCadence === 'both'
        ? [clause('shall', 'The solution shall support real-time or near-real-time ingestion in addition to batch ingestion.')]
        : []),
      clause('should', 'The solution should maintain data lineage from ingested sources through to generated outputs.'),
    ])
  }

  // 8. Retrieval-Augmented Generation Requirements
  if (wantsRag) {
    section('Retrieval-Augmented Generation Requirements', [
      clause('shall', 'Where retrieval-augmented generation is required, the solution shall support ingestion, parsing, chunking, metadata extraction, embedding generation, indexing, retrieval, reranking, source attribution and citation-grounded response generation.'),
      clause('shall', 'The solution shall retain metadata necessary to trace generated responses back to source documents, document sections, timestamps and retrieval results.'),
      clause('should', 'The solution should support hybrid retrieval combining keyword and semantic search, with configurable retrieval parameters.'),
    ])
  }

  // 9. Model Gateway and Model-Serving Requirements
  section('Model Gateway and Model-Serving Requirements', [
    clause('shall', 'The solution shall include a model gateway or equivalent abstraction layer to decouple application logic from specific model providers and model-serving backends.'),
    clause('shall', 'The model gateway shall support secure configuration of endpoint URLs, authentication credentials, model identifiers, routing rules and fallback policies.'),
    clause('shall', `The solution shall support one or more model-serving approaches, including hosted endpoints, self-hosted endpoints or hybrid deployment, depending on ${org}’s requirements.`),
    ...(has(input.modelStrategy, 'gpu')
      ? [clause('shall', 'The solution shall support accelerator-backed inference for the required workloads, without mandating a specific hardware vendor unless explicitly requested.')]
      : []),
    clause('should', 'The solution should support routing and fallback across multiple model endpoints to improve resilience and avoid single points of failure.'),
  ])

  // 10. Interoperability and Portability Requirements
  section('Interoperability and Portability Requirements', [
    clause('shall', 'The solution shall expose and consume standards-based, documented interfaces between components.'),
    clause('shall', 'The solution shall store data, metadata and configuration in portable, documented formats that support export and migration.'),
    clause('should', 'The solution should avoid hard dependencies on proprietary services that cannot be substituted with equivalent alternatives.'),
  ])

  // 11. Security and Access Control Requirements
  if (prefs.includeSecurityRequirements) {
    const sec: TenderClause[] = [
      clause('shall', 'The solution shall provide identity management, role-based access control, encryption at rest and in transit, secret management, network security, audit logging and policy enforcement.'),
    ]
    if (input.securityRequirements.length) {
      sec.push(clause('shall', `The solution shall meet the following security requirements: ${input.securityRequirements.join('; ')}.`))
    }
    if (input.dataSensitivity === 'restricted' || input.dataSensitivity === 'high') {
      sec.push(clause('shall', 'The solution shall ensure that sensitive data is processed and stored only within approved environments, with controls to prevent routing of sensitive data to unapproved external endpoints.'))
    }
    sec.push(clause('should', 'The solution should support data classification and policy-based routing of requests to approved environments.'))
    section('Security and Access Control Requirements', sec)
  }

  // 12. Governance and Auditability Requirements
  section('Governance and Auditability Requirements', [
    clause('shall', 'The solution shall maintain audit logs of user queries, retrieved sources, model responses, configuration changes and user feedback.'),
    clause('shall', 'The solution shall support data retention and disposal policies defined by the Authority.'),
    ...(humanInLoop
      ? [clause('shall', 'The solution shall support human review and approval of model outputs or actions where required.')]
      : []),
    clause('should', 'The solution should provide governance reporting suitable for compliance and oversight functions.'),
  ])

  // 13. Observability, Monitoring, and Evaluation Requirements
  section('Observability, Monitoring, and Evaluation Requirements', [
    clause('shall', 'The solution shall include monitoring for application health, model performance, retrieval quality, latency, throughput, errors, user feedback and operational cost where applicable.'),
    clause('shall', 'The solution shall include test datasets and evaluation metrics covering regression testing, hallucination checks, citation accuracy, retrieval quality and user acceptance testing.'),
    clause('should', 'The solution should support alerting on defined thresholds and scheduled evaluation runs.'),
  ])

  // 14. Performance and Scalability Requirements
  const perf = input.performanceRequirements
  const perfClauses: TenderClause[] = [
    clause('shall', 'The solution shall meet the Authority’s performance requirements under representative workloads and scale horizontally to meet demand.'),
  ]
  const perfBits = [
    perf.concurrentUsers && `support at least ${perf.concurrentUsers} concurrent users`,
    perf.dailyQueryVolume && `handle a daily volume of approximately ${perf.dailyQueryVolume}`,
    perf.documentCorpusSize &&
      `index and retrieve across a corpus of approximately ${perf.documentCorpusSize}${
        perf.documentCorpusUnit ? ` ${perf.documentCorpusUnit}` : ''
      }`,
    perf.latencyTarget && `meet a latency target of ${perf.latencyTarget}`,
    perf.throughputTarget && `meet a throughput target of ${perf.throughputTarget}`,
  ].filter(Boolean) as string[]
  if (perfBits.length) {
    perfClauses.push(clause('shall', `The solution shall ${perfBits.join(', ')}.`))
  }
  section('Performance and Scalability Requirements', perfClauses)

  // 15. Reliability, Availability, and Disaster Recovery Requirements
  const relClauses: TenderClause[] = [
    clause('shall', 'The solution shall provide health checks, failover and backup and restore for configuration, metadata and knowledge indexes.'),
  ]
  const relBits = [
    perf.availabilityTarget && `meet an availability target of ${perf.availabilityTarget}`,
    perf.rto && `meet a recovery time objective (RTO) of ${perf.rto}`,
    perf.rpo && `meet a recovery point objective (RPO) of ${perf.rpo}`,
  ].filter(Boolean) as string[]
  if (relBits.length) relClauses.push(clause('shall', `The solution shall ${relBits.join(', ')}.`))
  relClauses.push(clause('should', 'The solution should support disaster recovery procedures that are tested periodically.'))
  if (prefs.includeServiceLevels) {
    relClauses.push(clause('shall', 'The Contractor shall provide service-level commitments covering availability, response and resolution times.'))
  }
  section('Reliability, Availability, and Disaster Recovery Requirements', relClauses)

  // 16. Integration Requirements
  section('Integration Requirements', [
    clause('shall', 'The solution shall provide secure APIs and integration adapters for connecting to enterprise systems, document repositories, databases, workflow tools, notification systems and other required data sources.'),
    clause('should', 'The solution should support standards-based integration patterns to simplify future connections.'),
  ])

  // 17. Human-in-the-Loop and Approval Workflow Requirements
  if (humanInLoop) {
    section('Human-in-the-Loop and Approval Workflow Requirements', [
      clause('shall', 'The solution shall provide human-in-the-loop review and approval workflows for designated actions or outputs.'),
      clause('shall', 'The solution shall record reviewer identity, decision and rationale for audit purposes.'),
      clause('should', 'The solution should allow configurable approval thresholds and escalation paths.'),
    ])
  }

  // --- Supporting arrays (also drive sections 18/19/23 and the Export view) --
  const acceptanceTests = buildAcceptanceTests(input, wantsRag)
  const deliverables = buildDeliverables(wantsAgentic)
  const evaluationCriteria = buildEvaluationCriteria()

  // 18. Testing and Acceptance Criteria
  if (prefs.includeAcceptanceTests) {
    section(
      'Testing and Acceptance Criteria',
      acceptanceTests.map((t) => clause('shall', `The Contractor shall demonstrate that: ${t}`)),
      'The following acceptance tests shall be satisfied prior to acceptance.',
    )
  }

  // 19. Deliverables
  if (prefs.includeDeliverables) {
    section(
      'Deliverables',
      deliverables.map((d) => clause('shall', `The Contractor shall deliver: ${d}`)),
    )
  }

  // 20. Documentation Requirements
  section('Documentation Requirements', [
    clause('shall', 'The Contractor shall provide architecture documentation, interface contracts, configuration guides, operational runbooks and security documentation.'),
    clause('should', 'Documentation should be sufficient to allow a competent third party to operate, maintain and extend the solution.'),
  ])

  // 21. Training and Handover Requirements
  section('Training and Handover Requirements', [
    clause('shall', 'The Contractor shall provide training and a structured handover to the Authority’s operational and technical staff.'),
    clause('should', 'The Contractor should provide role-based training materials for administrators, operators and end users.'),
  ])

  // 22. Maintenance and Support Requirements
  if (prefs.includeSupportRequirements) {
    section('Maintenance and Support Requirements', [
      clause('shall', 'The Contractor shall provide maintenance, support and lifecycle management, including patching, upgrades and defect resolution.'),
      ...(prefs.includeMilestones
        ? [clause('should', 'The Contractor should propose a maintenance plan aligned to delivery milestones.')]
        : []),
      clause('should', 'The Contractor should provide a clear path for model and component updates without service disruption.'),
    ])
  }

  // 23. Optional Evaluation Criteria for Tender Assessment
  if (prefs.includeEvaluationCriteria) {
    section(
      'Evaluation Criteria for Tender Assessment',
      evaluationCriteria.map((c) => clause('should', c)),
      'The following criteria may be used to assess tender responses.',
    )
  }

  // Optional: non-mandatory reference examples (gated, clearly labelled)
  if (prefs.includeReferenceExamples) {
    sections.push({
      heading: 'Non-Mandatory Reference Examples',
      isReferenceExamples: true,
      intro:
        'The following examples are provided for context only. They are non-mandatory and the Contractor may propose equivalent alternatives that meet the requirements.',
      clauses: [
        clause('should', 'Examples of possible implementation technologies may include, but are not limited to, open-source or commercial model-serving engines (for example vLLM, TensorRT-LLM, SGLang), vector databases (for example Qdrant, Weaviate, Pinecone, pgvector), observability tools (for example Langfuse), workflow orchestrators, and cloud or on-premises infrastructure platforms (for example Kubernetes). These examples are non-mandatory and equivalent alternatives may be proposed.'),
      ],
    })
  }

  return {
    title: input.projectTitle ? `Tender Specification — ${input.projectTitle}` : 'Tender Specification',
    sections,
    evaluationCriteria,
    acceptanceTests,
    deliverables,
    ...(prefs.includeDelegationPlan ? { delegationPlan: generateDelegationPlan(input) } : {}),
  }
}

function stageLabel(stage: ProjectInput['projectStage']): string {
  switch (stage) {
    case 'poc':
      return 'proof of concept'
    case 'pilot':
      return 'pilot'
    case 'production':
      return 'production system'
    case 'enterprise':
      return 'enterprise platform'
  }
}

function buildAcceptanceTests(input: ProjectInput, wantsRag: boolean): string[] {
  const tests = [
    'the model provider can be changed through configuration without changing core application code',
    'generation, embedding and reranking models can be configured independently',
  ]
  if (wantsRag) tests.push('retrieval returns results with accurate source citations')
  tests.push('role-based access control restricts functions and data appropriately')
  tests.push('audit logging captures user queries, retrieved sources, model responses and user feedback')
  tests.push('the system fails over to an alternative model endpoint when a primary endpoint is unavailable')
  if (input.dataSensitivity === 'restricted' || input.dataSensitivity === 'high') {
    tests.push('sensitive data is routed only to approved environments')
  }
  tests.push('the system can ingest and retrieve from the required document types')
  tests.push('latency and throughput targets are met under representative workload')
  tests.push('backup and restore of configuration, metadata and knowledge indexes succeeds')
  tests.push('key system configuration and documentation can be exported for future migration')
  return tests
}

function buildDeliverables(wantsAgentic: boolean): string[] {
  const items = [
    'a working solution deployed to the agreed environment(s)',
    'architecture documentation and interface contracts',
    'source code and/or configuration with deployment scripts',
    'a model gateway configuration supporting interchangeable endpoints',
    'security and access-control configuration and documentation',
    'monitoring, evaluation and alerting configuration',
    'test datasets, evaluation results and acceptance test evidence',
    'operational runbooks and a maintenance plan',
    'training materials and handover documentation',
  ]
  if (wantsAgentic) items.push('a tool registry and documented tool/integration interfaces')
  return items
}

function buildEvaluationCriteria(): string[] {
  return [
    'Degree of vendor neutrality and avoidance of lock-in',
    'Modularity and ease of replacing components',
    'Quality and security of the proposed architecture',
    'Retrieval quality and citation accuracy (where applicable)',
    'Performance, scalability and reliability against stated targets',
    'Strength of security, governance and auditability controls',
    'Quality of observability and evaluation approach',
    'Interoperability and portability of data and interfaces',
    'Total cost of ownership and value for money',
    'Delivery approach, team capability and support model',
  ]
}
