import type { ReactNode } from 'react'

/* A labelled wrapper used by all controls. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className={inputClass}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        className={inputClass}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

/** Numeric value paired with a unit dropdown (e.g. corpus size + KB/MB/GB/TB). */
export function NumberUnitField({
  label,
  value,
  unit,
  unitOptions,
  onValueChange,
  onUnitChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  unit: string
  unitOptions: readonly Option[]
  onValueChange: (v: string) => void
  onUnitChange: (v: string) => void
  placeholder?: string
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onValueChange(e.target.value)}
        />
        <select
          className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
        >
          {unitOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </Field>
  )
}

/** Free-text list, edited as comma-separated values. */
export function CommaListField({
  label,
  value,
  onChange,
  placeholder,
  hint = 'Separate items with commas.',
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className={inputClass}
        value={value.join(', ')}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    </Field>
  )
}

export interface Option {
  value: string
  label: string
}

export function RadioGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly Option[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                active
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

/** Multi-select chips backed by a string[] value. */
export function CheckGroup({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string
  options: readonly string[]
  value: string[]
  onChange: (v: string[]) => void
  hint?: string
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                active
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300'
              }`}
            >
              {active ? '✓ ' : ''}
              {opt}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-indigo-300"
    >
      <span
        className={`mt-0.5 flex h-5 w-9 flex-none items-center rounded-full p-0.5 transition ${
          checked ? 'bg-indigo-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-4' : ''}`}
        />
      </span>
      <span>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
    </button>
  )
}
