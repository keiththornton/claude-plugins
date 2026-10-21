import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'tool-lights',
  component: 'Pane',
  requestId: 'tool-lights',
  props: {
    title: 'Tool lights',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const STRIP = {
  plugin: 'tool-lights',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 3,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 3 },
    view: {},
  },
} as const

let saved: Record<string, unknown> = {}

function stubEngine(on: Parameters<Parameters<typeof test>[1]>[1]) {
  saved = {}
  mock.clock(on, { now: 1_000_000 })
  // A store in memory; the test reads what the mod saves through `saved`
  on('store.get', (_, e) => ({ value: saved[e.key] }))
  on('store.set', (_, e) => {
    saved[e.key] = e.value
    return { value: undefined }
  })
  on('command.register', () => ({ value: { command: 'tool-lights' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.list', () => ({
    value: [
      { name: 'Bash', description: '', mcp: false },
      { name: 'mcp__plugin_jec-index_jec__symbol', description: '', mcp: true },
      { name: 'mcp__plugin_jec-index_jec__deps', description: '', mcp: true },
      { name: 'mcp__plugin_node-runtime_node-runtime__attach', description: '', mcp: true },
    ],
  }))
  on('command.list', () => ({ value: [{ name: 'deliberate:deliberate', description: '', source: 'plugin', plugin: 'deliberate' }] }))
  // Nothing draws the band beneath the plugin: this stands for the engine's own
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
}

test('the strip shows each plugin as a name and a dot per tool', async ($, on) => {
  stubEngine(on)
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'mcp__plugin_jec-index_jec__symbol', symbol: 'x' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...STRIP, surface })
    expect(await ui.find({ type: 'Text', text: /jec-index/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /node-runtime/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /deliberate/ })).toBeDefined()
    // Long names stay out of the strip
    expect(await ui.find({ type: 'Text', text: /mcp__plugin/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: '●' })).toBeDefined()
    expect(await ui.find({ key: 'expand' })).toBeDefined()
    await ui.unmount()
  }
})

test('the pane groups by plugin with short names, and a pin moves a tool to the top and the strip', async ($, on) => {
  stubEngine(on)
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'mcp__plugin_jec-index_jec__symbol', symbol: 'x' })

  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /^jec-index$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^symbol$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^\/deliberate$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /pinned/ })).toBeUndefined()
  await ui.press({ key: 'pin:mcp__plugin_jec-index_jec__symbol' })
  expect(await ui.find({ type: 'Text', text: /pinned/ })).toBeDefined()
  await ui.unmount()

  // The pinned tool is spelled out in the strip, with its count
  ui = await $.ui.mount({ ...STRIP, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /^symbol 1$/ })).toBeDefined()
  await ui.unmount()

  // The pin outlives the session
  expect(saved.pins).toEqual(['mcp__plugin_jec-index_jec__symbol'])
})

test('active-only hides idle rows, and a failed call goes red', async ($, on) => {
  stubEngine(on)
  on('tool.call', () => ({ result: {}, isError: true }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'mcp__plugin_jec-index_jec__deps', symbol: 'x' })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /^symbol$/ })).toBeDefined()
  await ui.press({ key: 'view' })
  expect(await ui.find({ type: 'Text', text: /^symbol$/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^deps$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '●' })).toBeDefined()
  await ui.unmount()
})

test('a plugin skill lights up when it expands, counted once with the Skill tool', async ($, on) => {
  stubEngine(on)
  on('skill.prompt', (_, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Skill', skill: 'deliberate:deliberate' })
  await $.skill.prompt({ skill: 'deliberate:deliberate', text: 'Plan it.' })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /^1$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^2$/ })).toBeUndefined()
  await ui.unmount()
})
