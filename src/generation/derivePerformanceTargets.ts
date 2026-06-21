import type { CorpusUnit, PerformanceRequirements, ProjectStage } from '@/types/project'

/**
 * Derives sensible, standards-based performance targets (latency, availability,
 * throughput) from the scale inputs the user does provide (concurrent users,
 * daily query volume, corpus size) plus the project stage — so the user does not
 * have to guess them. A safety buffer is built in for unforeseen scale.
 *
 * Basis:
 *  - Latency: LLM-serving guidance (TTFT ~200ms, end-to-end p95 ~3s) with RAG
 *    retrieval adding ~40%, and the Nielsen/RAIL ~1s "in flow" threshold.
 *  - Availability: the standard "nines" (99.9% ≈ 8.8h downtime/year, etc.).
 *  - Throughput: peak:average TPS ≈ 3–5x; reserve 30–50% headroom (we use 50%).
 *
 * Any value already supplied is respected (effective = provided || derived).
 */

export interface DerivedTargets {
  latencyTarget: string
  availabilityTarget: string
  throughputTarget: string
  rationale: {
    latency: string
    availability: string
    throughput: string
  }
}

/** Parse the leading number out of a free-text field ("10,000 docs" -> 10000). */
function parseNum(value?: string): number | undefined {
  if (!value) return undefined
  const digits = value.replace(/[^0-9.]/g, '')
  if (!digits) return undefined
  const n = Number.parseFloat(digits)
  return Number.isFinite(n) ? n : undefined
}

/** Normalise a corpus size to gigabytes for thresholding. */
function corpusToGB(size?: string, unit?: CorpusUnit): number | undefined {
  const n = parseNum(size)
  if (n === undefined) return undefined
  switch (unit ?? 'GB') {
    case 'KB':
      return n / 1_000_000
    case 'MB':
      return n / 1_000
    case 'TB':
      return n * 1_000
    case 'GB':
    default:
      return n
  }
}

const AVAILABILITY_DOWNTIME: Record<string, string> = {
  '99.0%': '≈ 3.65 days downtime/year',
  '99.5%': '≈ 1.83 days downtime/year',
  '99.9%': '≈ 8.8 hours downtime/year',
  '99.95%': '≈ 4.4 hours downtime/year',
}

function round(n: number): number {
  // One decimal below 10, whole numbers above (ceil so we never under-provision).
  return n < 10 ? Math.ceil(n * 10) / 10 : Math.ceil(n)
}

export function deriveTargets(
  perf: PerformanceRequirements,
  stage: ProjectStage,
): DerivedTargets {
  const concurrent = parseNum(perf.concurrentUsers)
  const daily = parseNum(perf.dailyQueryVolume)
  const corpusGB = corpusToGB(perf.documentCorpusSize, perf.documentCorpusUnit)

  // --- Scale tier ----------------------------------------------------------
  const large = (concurrent ?? 0) > 500 || (daily ?? 0) > 200_000
  const medium = (concurrent ?? 0) >= 100 || (daily ?? 0) >= 20_000
  const tier = large ? 'large' : medium ? 'medium' : 'small'
  const bigCorpus = (corpusGB ?? 0) >= 500

  // --- Throughput ----------------------------------------------------------
  // Busy hour ≈ 15% of daily volume; each active user issues ~1 query / 30s.
  const qpsFromDaily = daily ? (daily * 0.15) / 3600 : 0
  const qpsFromConcurrent = concurrent ? concurrent / 30 : 0
  const peakQps = Math.max(qpsFromDaily, qpsFromConcurrent)
  const targetQps = Math.max(5, round(peakQps * 1.5)) // 50% headroom, baseline 5/s
  const throughputTarget = perf.throughputTarget || `≥ ${targetQps} requests/second at peak`
  const throughputRationale = perf.throughputTarget
    ? 'Using the throughput you supplied.'
    : `Peak demand from ${concurrent ? `${concurrent} concurrent users` : 'usage'}${
        daily ? ` and ${daily.toLocaleString()} daily queries` : ''
      }, plus 50% headroom for unforeseen surges (best practice: 30–50% buffer, never run at 100%).`

  // --- Latency -------------------------------------------------------------
  const p95Base = tier === 'small' ? 2.5 : tier === 'medium' ? 3 : 4
  const p95 = p95Base + (bigCorpus ? 0.5 : 0)
  const ttft = tier === 'large' ? 1.5 : 1
  const latencyTarget = perf.latencyTarget || `p95 end-to-end ≤ ${p95}s (time-to-first-token ≤ ${ttft}s)`
  const latencyRationale = perf.latencyTarget
    ? 'Using the latency you supplied.'
    : `Interactive ${tier}-scale target: LLM serving aims for TTFT ≤ 1s and end-to-end p95 ≤ ~3s; RAG retrieval adds ~40%${
        bigCorpus ? ', and a large corpus (≥ 500 GB) adds retrieval time' : ''
      }, keeping responses within the ~1s "in flow" threshold for streamed output.`

  // --- Availability --------------------------------------------------------
  let availability =
    stage === 'poc' ? '99.0%' : stage === 'pilot' ? '99.5%' : stage === 'enterprise' ? '99.95%' : '99.9%'
  if (large && availability === '99.9%') availability = '99.95%'
  const availabilityTarget = perf.availabilityTarget || availability
  const availabilityRationale = perf.availabilityTarget
    ? 'Using the availability you supplied.'
    : `${availability} ${AVAILABILITY_DOWNTIME[availability] ?? ''} — stepped to a ${stage} system${
        large ? ' at large scale' : ''
      }; each additional nine is ~10× harder and costlier.`

  return {
    latencyTarget,
    availabilityTarget,
    throughputTarget,
    rationale: {
      latency: latencyRationale,
      availability: availabilityRationale,
      throughput: throughputRationale,
    },
  }
}
