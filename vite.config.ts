import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE) so the proxy can read the secret key
  // server-side. The key is NEVER exposed to the client bundle this way.
  const env = loadEnv(mode, process.cwd(), '')
  const azureEndpoint = (env.VITE_AZURE_OPENAI_ENDPOINT ?? '').trim().replace(/\/+$/, '')
  const azureKey = (env.VITE_AZURE_OPENAI_KEY ?? '').trim()

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // elkjs (the layout engine) is intentionally a large, lazily-loaded chunk
      // that only the diagram step pulls in — so the default 500 kB warning is
      // expected here. The main app chunk stays well under it.
      chunkSizeWarningLimit: 1600,
    },
    server: {
      // Proxy browser → Azure OpenAI so the app avoids CORS (Azure sends no CORS
      // headers) and the API key stays server-side, out of the client bundle.
      // Only active when an endpoint is configured in .env.local.
      proxy: azureEndpoint
        ? {
            '/azure-openai': {
              target: azureEndpoint,
              changeOrigin: true,
              secure: true,
              rewrite: (p) => p.replace(/^\/azure-openai/, ''),
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  if (azureKey) proxyReq.setHeader('api-key', azureKey)
                })
              },
            },
          }
        : undefined,
    },
  }
})
