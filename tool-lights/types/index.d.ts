/** One light. The key it is stored under is its label. */
export type Light = {
  /** What the light stands for: a tool name, or `skill:<name>` */
  label: string
  /** `idle` never called, `running` a call in flight, `ok` the last call finished, `failed` it was denied or errored */
  status: 'idle' | 'running' | 'ok' | 'failed'
  /** Calls seen this session */
  count: number
  /** Calls in flight right now */
  inFlight: number
  /** Milliseconds since the epoch of the last call's start, 0 when never called */
  lastAt: number
  /** Milliseconds since the epoch until which the light glows bright, 0 when it is not glowing */
  glowUntil: number
}

/** Which rows the expanded pane shows */
export type View = 'all' | 'active'

declare module 'claude-code' {
  interface PluginState {
    'tool-lights': {
      /** Every light, keyed by label, in the order they were added */
      lights: Record<string, Light>
      /** Labels the person pinned: shown by name in the strip, and first in the pane */
      pins: string[]
      /** Which rows the expanded pane shows */
      view: View
    }
  }
}
