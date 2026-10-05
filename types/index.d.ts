export type Stamps = Record<string, number>

declare module 'claude-code' {
  interface PluginState {
    'msg-timestamps': { stamps: Stamps; offsetMin: number | null }
  }
}
