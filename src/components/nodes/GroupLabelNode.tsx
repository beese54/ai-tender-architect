import type { NodeProps } from 'reactflow'
import type { GroupLabelData } from '@/generation/diagramGenerator'

/** Non-interactive band/zone caption used by the deployment & security views. */
export default function GroupLabelNode({ data }: NodeProps<GroupLabelData>) {
  return (
    <div
      className="w-[180px] rounded-md border-l-4 bg-slate-50/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm"
      style={{ borderColor: data.accent }}
    >
      {data.label}
    </div>
  )
}
