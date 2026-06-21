import { toPng, toSvg } from 'html-to-image'
import type { ProjectInput } from '@/types/project'
import type { GeneratedArchitecture } from '@/types/architecture'
import type { GeneratedTender } from '@/types/tender'
import type { DelegationOwner, DelegationPlan } from '@/types/delegation'

/* ------------------------------------------------------------------ Markdown */

export function architectureToMarkdown(arch: GeneratedArchitecture): string {
  const lines: string[] = [`# ${arch.title}`, '']

  const groups = [...new Set(arch.nodes.map((n) => n.group))]
  lines.push('## Architecture Layers & Components', '')
  for (const group of groups) {
    lines.push(`### ${group}`)
    for (const n of arch.nodes.filter((x) => x.group === group)) {
      lines.push(`- **${n.label}**${n.required ? '' : ' _(recommended)_'} — ${n.description}`)
    }
    lines.push('')
  }

  if (arch.assumptions.length) {
    lines.push('## Assumptions', '')
    arch.assumptions.forEach((a) => lines.push(`- ${a}`))
    lines.push('')
  }
  if (arch.risks.length) {
    lines.push('## Vendor Lock-in & Design Risks', '')
    arch.risks.forEach((r) => lines.push(`- ${r}`))
    lines.push('')
  }
  return lines.join('\n')
}

export function tenderToMarkdown(tender: GeneratedTender): string {
  const lines: string[] = [`# ${tender.title}`, '']
  tender.sections.forEach((sec, i) => {
    lines.push(`## ${i + 1}. ${sec.heading}`)
    if (sec.intro) lines.push('', `_${sec.intro}_`)
    lines.push('')
    sec.clauses.forEach((c, j) => {
      lines.push(`${i + 1}.${j + 1} The solution ${c.level === 'shall' ? '**shall**' : 'should'} — ${stripLead(c.text)}`)
    })
    lines.push('')
  })
  if (tender.delegationPlan) {
    lines.push(delegationPlanToMarkdown(tender.delegationPlan))
  }
  return lines.join('\n')
}

const OWNER_LABEL: Record<DelegationOwner, string> = {
  deterministic: 'Deterministic',
  model: 'Model',
  hybrid: 'Hybrid',
}

/** Render the structured delegation plan as a Markdown table + anti-pattern list. */
export function delegationPlanToMarkdown(plan: DelegationPlan): string {
  const cell = (parts?: string[]): string => (parts && parts.length ? parts.join('; ') : '—')
  const lines: string[] = ['## AI Task Delegation Plan', '', plan.summary, '']
  lines.push('| # | Subtask | Owner | Why | Evidence fed to model | Post-checks | Fallback |')
  lines.push('|---|---|---|---|---|---|---|')
  plan.subtasks.forEach((s, i) => {
    lines.push(
      `| ${i + 1} | ${s.task} | ${OWNER_LABEL[s.owner]} | ${s.reason} | ${cell(s.evidence)} | ${cell(s.postChecks)} | ${s.fallback ?? '—'} |`,
    )
  })
  lines.push('')
  if (plan.antiPatterns.length) {
    lines.push('### Anti-patterns flagged', '')
    plan.antiPatterns.forEach((a) => lines.push(`- **${a.risk}** → ${a.remedy}`))
    lines.push('')
  }
  return lines.join('\n')
}

/** Tender clauses already contain "shall/should"; strip a leading subject for the numbered form. */
function stripLead(text: string): string {
  return text
}

export function combinedMarkdown(
  input: ProjectInput,
  arch: GeneratedArchitecture,
  tender: GeneratedTender,
): string {
  const header = [
    `# ${input.projectTitle || 'AI Solution'} — Architecture & Tender Specification`,
    '',
    input.organisation ? `**Organisation:** ${input.organisation}` : '',
    `**Stage:** ${input.projectStage}`,
    '',
    '---',
    '',
  ]
    .filter((l) => l !== '')
    .join('\n')
  return [header, architectureToMarkdown(arch), '\n---\n', tenderToMarkdown(tender)].join('\n')
}

/* ------------------------------------------------------------------ Clipboard */

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

/* ------------------------------------------------------------- File downloads */

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/* ------------------------------------------------------------ Diagram image */

export async function downloadDiagramImage(
  element: HTMLElement,
  format: 'png' | 'svg',
  filename: string,
): Promise<void> {
  const options = { backgroundColor: '#ffffff', cacheBust: true, pixelRatio: 2 }
  const dataUrl = format === 'png' ? await toPng(element, options) : await toSvg(element, options)
  triggerDownload(dataUrl, filename)
}

export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'output'
  )
}
