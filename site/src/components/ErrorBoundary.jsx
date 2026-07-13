import { Component } from 'react'

/*
 * Top-level safety net. A render/commit crash anywhere in the tree is caught
 * here and shown as a graceful on-brand page instead of a blank white screen.
 * The full error + React component stack are logged to the console (with source
 * maps on, these map back to real files/lines) so the cause is diagnosable.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught:', error, '\ncomponentStack:', info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
        <p className="label-mono text-accent">Something went wrong</p>
        <h1 className="max-w-[28ch] text-2xl font-bold tracking-tight text-ink">
          This page hit an unexpected error<span className="text-accent">.</span>
        </h1>
        <p className="max-w-[42ch] leading-relaxed text-soft">
          Reloading usually fixes it. If it keeps happening, do let me know.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="label-mono border border-ink px-5 py-3 text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Reload
        </button>
      </div>
    )
  }
}
