import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import type { ArchNodeData } from '@/generation/diagramGenerator'

/** Read-only architecture node, styled by its layer accent colour. */
export default function ArchNode({ data }: NodeProps<ArchNodeData>) {
  return (
    <div
      className="w-[230px] overflow-hidden rounded-md border bg-white shadow-sm transition-opacity"
      style={{ borderColor: data.accent, opacity: data.dimmed ? 0.35 : 1 }}
    >
      <Handle type="target" position={Position.Top} style={{ background: data.accent }} />
      <div
        className="px-2.5 py-1 text-xs font-semibold text-white"
        style={{ backgroundColor: data.accent }}
      >
        {data.label}
        {data.count !== undefined && (
          <span className="ml-1 font-normal opacity-90">· {data.count}</span>
        )}
      </div>
      <div className="px-2.5 py-1.5">
        <p className="text-[11px] leading-snug text-slate-500">{data.description}</p>
        {data.count === undefined && !data.required && (
          <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            recommended
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: data.accent }} />
    </div>
  )
}
