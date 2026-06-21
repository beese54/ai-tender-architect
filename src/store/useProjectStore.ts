import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProjectInput } from '@/types/project'
import type { GeneratedArchitecture } from '@/types/architecture'
import type { GeneratedTender, NeutralityWarning } from '@/types/tender'
import { createEmptyProject, DEFAULT_PROJECT, PRESETS } from '@/constants/presets'
import { ruleBasedProvider } from '@/generation/ruleBased'
import { azureLlmProvider, isAzureConfigured } from '@/generation/llm'
import type { GenerationProvider } from '@/generation/types'
import { inferConfiguration } from '@/generation/inferConfiguration'
import { checkVendorNeutrality } from '@/generation/vendorNeutralityChecker'
import type { DiagramView } from '@/generation/diagramGenerator'

export type StepId = 'intake' | 'diagram' | 'tender' | 'export'

export type ProviderId = 'rule-based' | 'azure'

/** Whether the Azure OpenAI engine has its env vars configured. */
export const azureAvailable = isAzureConfigured()

const PROVIDERS: Record<ProviderId, GenerationProvider> = {
  'rule-based': ruleBasedProvider,
  azure: azureLlmProvider,
}

export const STEPS: { id: StepId; label: string }[] = [
  { id: 'intake', label: 'Project Intake' },
  { id: 'diagram', label: 'Diagram Preview' },
  { id: 'tender', label: 'Tender Specification' },
  { id: 'export', label: 'Export / Copy' },
]

interface ProjectState {
  input: ProjectInput
  currentStep: StepId
  diagramView: DiagramView
  architecture: GeneratedArchitecture | null
  tender: GeneratedTender | null
  warnings: NeutralityWarning[]
  /** The full input after AI inference, shown read-only for transparency. */
  inferred: ProjectInput | null
  /** Which generation engine to use. Not persisted (avoids surprise AI calls on reload). */
  provider: ProviderId
  /** True while a generation is in flight (LLM calls are async). */
  isGenerating: boolean
  /** Last generation error message, if any (e.g. Azure call failed). */
  genError: string | null

  setStep: (step: StepId) => void
  setProvider: (provider: ProviderId) => void
  setDiagramView: (view: DiagramView) => void
  /** Shallow patch of top-level input fields. */
  updateInput: (patch: Partial<ProjectInput>) => void
  /** Patch a nested object field (performanceRequirements / tenderPreferences). */
  updateNested: <K extends 'performanceRequirements' | 'tenderPreferences'>(
    key: K,
    patch: Partial<ProjectInput[K]>,
  ) => void
  loadPreset: (presetId: string) => void
  reset: () => void
  generate: () => Promise<void>
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      input: structuredClone(DEFAULT_PROJECT),
      currentStep: 'intake',
      diagramView: 'logical',
      architecture: null,
      tender: null,
      warnings: [],
      inferred: null,
      provider: 'rule-based',
      isGenerating: false,
      genError: null,

      setStep: (step) => set({ currentStep: step }),
      setProvider: (provider) => set({ provider }),
      setDiagramView: (view) => set({ diagramView: view }),

      updateInput: (patch) => set({ input: { ...get().input, ...patch } }),

      updateNested: (key, patch) =>
        set({ input: { ...get().input, [key]: { ...get().input[key], ...patch } } }),

      loadPreset: (presetId) => {
        const preset = PRESETS.find((p) => p.id === presetId)
        if (!preset) return
        set({ input: structuredClone(preset.input), architecture: null, tender: null, warnings: [], inferred: null })
        void get().generate()
      },

      reset: () =>
        set({ input: createEmptyProject(), architecture: null, tender: null, warnings: [], inferred: null, currentStep: 'intake', genError: null }),

      generate: async () => {
        // Pick the engine; fall back to rule-based if Azure isn't configured.
        const providerId: ProviderId = get().provider === 'azure' && azureAvailable ? 'azure' : 'rule-based'
        const provider = PROVIDERS[providerId]

        // Derive the technical configuration from the intake, then generate.
        const derived = inferConfiguration(get().input)
        set({ isGenerating: true, genError: null })
        try {
          const architecture = await provider.generateArchitecture(derived)
          const tender = await provider.generateTender(derived, architecture)
          const warnings = checkVendorNeutrality(tender)
          set({ architecture, tender, warnings, inferred: derived, isGenerating: false })
        } catch (err) {
          // The Azure provider already falls back internally, so reaching here
          // means even the rule-based path failed — surface it rather than hang.
          const message = err instanceof Error ? err.message : 'Generation failed.'
          set({ isGenerating: false, genError: message })
        }
      },
    }),
    {
      name: 'tender-generator-v1',
      version: 3,
      // Only persist the user's inputs and navigation; outputs are regenerated.
      partialize: (s) => ({ input: s.input, currentStep: s.currentStep, diagramView: s.diagramView }),
      // v3 replaced the shipped default scenario. For any older persisted state, drop the
      // stored `input` so it falls back to the new DEFAULT_PROJECT, and coerce any removed
      // step id back to intake.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<{
          input: ProjectInput
          currentStep: StepId
          diagramView: DiagramView
        }>
        const currentStep = STEPS.some((s) => s.id === state.currentStep)
          ? (state.currentStep as StepId)
          : ('intake' as StepId)
        if (version < 3) {
          // Discard the old cached input (e.g. a prior example) so the new DEFAULT_PROJECT applies.
          return { currentStep, diagramView: state.diagramView }
        }
        return { ...state, currentStep }
      },
    },
  ),
)
