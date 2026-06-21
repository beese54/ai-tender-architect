/**
 * Specific vendor / product / proprietary-stack names that must NOT appear in
 * mandatory or desirable tender clauses unless the user explicitly enables
 * non-mandatory reference examples. Used by the vendorNeutralityChecker.
 */
export const VENDOR_TERMS: string[] = [
  'NVIDIA',
  'TensorRT-LLM',
  'TensorRT',
  'Dynamo',
  'SGLang',
  'vLLM',
  'OpenAI',
  'Anthropic',
  'Claude',
  'GPT',
  'Gemini',
  'AWS',
  'Amazon Web Services',
  'Azure',
  'Google Cloud',
  'GCP',
  'Qdrant',
  'Pinecone',
  'Weaviate',
  'Milvus',
  'Chroma',
  'pgvector',
  'Langfuse',
  'LangChain',
  'LlamaIndex',
  'Kubernetes',
  'Hugging Face',
  'Ollama',
  'Cohere',
  'Mistral',
]

/**
 * Build a case-insensitive, word-boundary regex for a term.
 * Escapes regex metacharacters and tolerates terms containing hyphens/spaces.
 */
export function termPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, 'i')
}
