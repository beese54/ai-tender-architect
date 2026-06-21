/** Generated architecture model — vendor-neutral nodes grouped by layer. */

export type ArchitectureViewType =
  | 'conceptual'
  | 'logical'
  | 'data-flow'
  | 'deployment'
  | 'security'

export interface ArchitectureNode {
  id: string
  label: string
  /** The layer this node belongs to (matches a LayerId / layer label). */
  group: string
  description: string
  /** true = mandatory in this design, false = recommended/optional. */
  required: boolean
}

export interface ArchitectureEdge {
  source: string
  target: string
  label?: string
}

export interface GeneratedArchitecture {
  title: string
  viewType: ArchitectureViewType
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
  assumptions: string[]
  risks: string[]
}
