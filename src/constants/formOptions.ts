/** Option lists for the intake form. Plain string values keep ProjectInput simple. */

export const USE_CASES = [
  'RAG chatbot',
  'Industrial copilot',
  'Operations planning assistant',
  'Tender drafting assistant',
  'Document search and summarisation',
  'Agentic workflow automation',
  'Computer vision and multimodal AI',
  'Predictive maintenance',
  'Decision support system',
  'Model-serving platform',
  'AI governance and evaluation platform',
] as const

export const DATA_SOURCES = [
  'Internal systems',
  'Structured databases',
  'Unstructured documents',
  'Knowledge bases',
  'Historical records',
  'APIs',
  'Email or messaging systems',
  'Sensor data',
  'Real-time telemetry',
  'External public data sources',
] as const

export const DATA_TYPES = [
  'Structured records',
  'PDFs',
  'Office documents',
  'Images',
  'Scanned documents',
  'Diagrams',
  'Videos',
  'Audio',
  'Sensor / time-series',
] as const

export const AI_CAPABILITIES = [
  'Text generation',
  'Summarisation',
  'Question answering',
  'Retrieval-augmented generation',
  'Citation-grounded answers',
  'Structured JSON output',
  'Tool calling',
  'Agent workflows',
  'Planning and reasoning',
  'Multimodal input',
  'Image understanding',
  'Document understanding',
  'Embeddings',
  'Reranking',
  'Classification',
  'Recommendation',
  'Forecasting',
  'Human-in-the-loop review',
  'Confidence scoring',
  'Audit trails',
  'Evaluation and benchmarking',
] as const

export const MODEL_STRATEGY = [
  'Hosted model API',
  'Self-hosted model',
  'Hybrid hosted and self-hosted',
  'GPU-backed serving',
  'CPU-only fallback',
  'Private endpoint',
  'Air-gapped or isolated environment',
  'Multiple interchangeable model providers',
  'Model gateway required',
  'Fallback model required',
  'Routing across multiple model providers',
  'Separate embedding, reranking, and generation models',
  'Need to switch vendors easily',
  'Need to avoid vendor lock-in',
] as const

export const ARCHITECTURE_PRIORITIES = [
  'Vendor agnostic',
  'Open source preference',
  'Cloud agnostic',
  'On-premises deployment',
  'Hybrid deployment',
  'High availability',
  'Disaster recovery',
  'Low latency',
  'High throughput',
  'Cost optimisation',
  'Data sovereignty',
  'Security',
  'Auditability',
  'Scalability',
  'Ease of maintenance',
  'Interoperability',
  'Modular replacement of components',
] as const

export const SECURITY_REQUIREMENTS = [
  'Identity and access management',
  'Role-based access control',
  'Data encryption at rest',
  'Data encryption in transit',
  'Secret management',
  'Audit logging',
  'Prompt and response logging',
  'Sensitive data handling',
  'Data retention controls',
  'Model output review',
  'Human approval workflow',
  'Policy guardrails',
  'Content safety',
  'Network segmentation',
  'Private connectivity',
  'Compliance requirements',
  'Incident response',
] as const

export const PROJECT_STAGES = [
  { value: 'poc', label: 'Proof of concept' },
  { value: 'pilot', label: 'Pilot' },
  { value: 'production', label: 'Production system' },
  { value: 'enterprise', label: 'Enterprise platform' },
] as const

export const DEPLOYMENT_OPTIONS = [
  { value: 'cloud', label: 'Public cloud' },
  { value: 'on-premises', label: 'On-premises' },
  { value: 'hybrid', label: 'Hybrid cloud' },
  { value: 'air-gapped', label: 'Air-gapped / isolated' },
  { value: 'not-specified', label: 'Not specified' },
] as const

export const SENSITIVITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'not-specified', label: 'Not specified' },
] as const

export const CADENCE_OPTIONS = [
  { value: 'batch', label: 'Batch' },
  { value: 'real-time', label: 'Real-time' },
  { value: 'both', label: 'Both' },
  { value: 'not-specified', label: 'Not specified' },
] as const

export const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'technical', label: 'Technical' },
  { value: 'procurement-ready', label: 'Procurement-ready' },
] as const

export const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'detailed', label: 'Detailed' },
] as const

export const CORPUS_UNIT_OPTIONS = [
  { value: 'KB', label: 'KB' },
  { value: 'MB', label: 'MB' },
  { value: 'GB', label: 'GB' },
  { value: 'TB', label: 'TB' },
] as const
