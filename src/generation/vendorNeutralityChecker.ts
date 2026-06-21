import type { GeneratedTender, NeutralityWarning } from '@/types/tender'
import { VENDOR_TERMS, termPattern } from '@/constants/vendorTerms'

/**
 * Scans a generated tender for specific vendor/product names appearing in
 * mandatory or desirable clauses. Clauses inside a clearly-labelled
 * reference-examples section are ignored (those are allowed by design).
 */
export function checkVendorNeutrality(tender: GeneratedTender): NeutralityWarning[] {
  const warnings: NeutralityWarning[] = []

  for (const sec of tender.sections) {
    if (sec.isReferenceExamples) continue // examples section is exempt
    for (const c of sec.clauses) {
      for (const term of VENDOR_TERMS) {
        if (termPattern(term).test(c.text)) {
          warnings.push({ term, sectionHeading: sec.heading, clauseText: c.text })
        }
      }
    }
  }

  return warnings
}
