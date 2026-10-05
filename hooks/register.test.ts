import { expect, mock, test } from 'claude-code/testing'
import type { RenderElement } from 'claude-code'

import { formatTime, parseOffset } from './register'

test('offset and time format', async () => {
  expect(parseOffset('+0700\n')).toBe(420)
  expect(parseOffset('-0530')).toBe(-330)
  expect(parseOffset('junk')).toBe(0)
  // 2026-10-05T07:02:43Z at +07:00
  expect(formatTime(Date.UTC(2026, 9, 5, 7, 2, 43), 420)).toBe('14:02:43')
})

test('a streamed reply block gets the time its first chunk arrived', async ($, on) => {
  mock.clock(on, { now: Date.UTC(2026, 9, 5, 7, 2, 43) })
  on('turn.step', async function* (_$, e) {
    yield { kind: 'text', index: 0, text: 'Fixed: token ' }
    yield { kind: 'text', index: 0, text: 'expiry check.' }
    return { turnId: e.turnId, index: e.index, answer: 'Fixed: token expiry check.', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  // Stands in for the engine's row: draws the text it is handed.
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, null, e.props.text) as RenderElement
  })

  const stream = $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', messageCount: 1 })
  for await (const _ of stream) {
    // drain
  }

  const ui = await $.ui.mount({
    plugin: 'msg-timestamps',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: 'Fixed: token expiry check.', isFirstOfReply: true },
  })
  const time = await ui.find({ type: 'Text', text: /07:02:43/ })
  expect(time?.props?.color).toBe('cyan')
  expect(await ui.find({ type: 'Markdown' })).toBeDefined()

  const other = await $.ui.mount({
    plugin: 'msg-timestamps',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: 'never streamed', isFirstOfReply: true },
  })
  expect(JSON.stringify(await other.drawn())).not.toContain('Markdown')
})
