import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Stamps } from '../types'

// Reply text -> epoch ms when its first chunk arrived. The render props carry
// no message id, so the text is the only key.
// ponytail: text key, two identical blocks share one time; switch to an id if the props ever carry one
const stamps = atom({ plugin: 'msg-timestamps', key: 'stamps' } as const, {} as Stamps)
// System UTC offset in minutes, read from `date +%z` so the system timezone wins.
const offsetMin = atom({ plugin: 'msg-timestamps', key: 'offsetMin' } as const, null as number | null)

const MAX_STAMPS = 500
// A theme key or a raw color (`cyan`, `#5fafff`).
const TIME_COLOR = 'cyan'

export const key = (text: string) => text.trim()

export const parseOffset = (z: string) => {
  const m = /^([+-])(\d\d)(\d\d)$/.exec(z.trim())
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
}

export const formatTime = (ms: number, offset: number) => {
  const d = new Date(ms + offset * 60_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const { exitCode, stdout } = await $.process.run(['date', '+%z'])
    if (exitCode === 0) await update($, offsetMin, () => parseOffset(stdout))
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    // Subagent replies are not drawn as AssistantMessage rows in the main transcript.
    if (e.agentId) return yield* next(e)

    const started = new Map<number, number>()
    const texts = new Map<number, string>()
    // The terminal draws a finished block once and never again, so the stamp
    // must be in state before the engine sees the block end, not after the stream.
    const flush = async () => {
      if (started.size === 0) return
      const done = [...started].map(([i, t]) => [key(texts.get(i) ?? ''), t] as const)
      started.clear()
      texts.clear()
      await update($, stamps, old => {
        const merged: Stamps = { ...old, ...Object.fromEntries(done) }
        const keys = Object.keys(merged)
        for (const k of keys.slice(0, Math.max(0, keys.length - MAX_STAMPS))) delete merged[k]
        return merged
      })
    }

    const stream = next(e)
    for await (const chunk of stream) {
      if (chunk.kind === 'text') {
        if (!started.has(chunk.index)) started.set(chunk.index, await $.clock.now())
        texts.set(chunk.index, (texts.get(chunk.index) ?? '') + chunk.text)
      } else {
        await flush()
      }
      yield chunk
    }
    await flush()
    return stream.result
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const t = (await read($, stamps))[key(e.props.text)]
    if (t === undefined) return next(e)

    const offset = (await read($, offsetMin)) ?? 0
    const { Box, Text, Markdown } = $.ui.resolve(e)
    // Our own row: a rewritten `text` is markdown only and cannot carry a color.
    return (
      <Box flexDirection="row" marginTop={1}>
        <Box width={2} flexShrink={0}>
          <Text>{e.props.isFirstOfReply ? '●' : ' '}</Text>
        </Box>
        <Box flexShrink={0}>
          <Text color={TIME_COLOR}>[{formatTime(t, offset)}] </Text>
        </Box>
        <Box flexGrow={1} flexShrink={1}>
          <Markdown text={e.props.text} />
        </Box>
      </Box>
    )
  })
}
