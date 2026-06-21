import type { NodeTypes } from 'reactflow'
import ArchNode from '@/components/nodes/ArchNode'
import GroupLabelNode from '@/components/nodes/GroupLabelNode'

/** Registers the custom architecture and band-caption nodes. */
export const archNodeTypes: NodeTypes = { arch: ArchNode, groupLabel: GroupLabelNode }
