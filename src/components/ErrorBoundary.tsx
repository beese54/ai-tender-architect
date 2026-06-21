import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

const PERSIST_KEY = 'tender-generator-v1'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  componentStack: string | null
}

/**
 * Catches render-time errors so an uncaught exception shows a readable panel
 * instead of unmounting the whole tree to a blank white page. The panel also
 * surfaces the error + component stack (the fastest way to find the cause) and
 * offers a "reset saved data" recovery, since stale persisted state from an
 * older build is the most common trigger.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info.componentStack)
    this.setState({ componentStack: info.componentStack ?? null })
  }

  private reload = () => window.location.reload()

  private resetAndReload = () => {
    try {
      localStorage.removeItem(PERSIST_KEY)
    } catch {
      /* ignore storage access errors */
    }
    window.location.reload()
  }

  render() {
    const { error, componentStack } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-2xl rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-base font-semibold text-red-700">Something went wrong</h1>
          <p className="mt-1 text-sm text-slate-600">
            The view hit an unexpected error. Your saved inputs are still stored — a reload usually
            recovers. If it keeps happening, reset the saved data (this clears your inputs).
          </p>

          <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
            {error.message}
            {componentStack && `\n${componentStack}`}
          </pre>

          <div className="mt-4 flex gap-2">
            <button
              onClick={this.reload}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Reload
            </button>
            <button
              onClick={this.resetAndReload}
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-600 hover:border-slate-400"
            >
              Reset saved data &amp; reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
