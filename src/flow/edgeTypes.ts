import type { EdgeTypes } from 'reactflow'
import RoutedEdge from '@/components/edges/RoutedEdge'

/** Registers the ELK-routed orthogonal edge under the `routed` type. */
export const archEdgeTypes: EdgeTypes = { routed: RoutedEdge }
