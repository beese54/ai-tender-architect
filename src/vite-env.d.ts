/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Azure endpoint — read SERVER-SIDE by the Vite proxy only (not the client). */
  readonly VITE_AZURE_OPENAI_ENDPOINT?: string
  /** Azure API key — read SERVER-SIDE by the Vite proxy only; never sent to the browser. */
  readonly VITE_AZURE_OPENAI_KEY?: string
  /** The deployment (model) name. Read by the client to build the proxied request URL. */
  readonly VITE_AZURE_OPENAI_DEPLOYMENT?: string
  /** Azure OpenAI REST API version. Defaults to 2024-10-21 if unset. */
  readonly VITE_AZURE_OPENAI_API_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
