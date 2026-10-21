import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Light, View } from '../types'

const PANE = 'tool-lights'
/** How long a light glows bright after a call, before it settles to a steady green */
const GLOW_MS = 3000
/** A skill seen by the Skill tool and then by skill.prompt within this window counts once */
const DEDUPE_MS = 5000

/** When each skill label was last counted, so the two skill hooks don't double-count */
const seen = new Map<string, number>()

const lights = atom({ plugin: 'tool-lights', key: 'lights' } as const, {})
const pins = atom({ plugin: 'tool-lights', key: 'pins' } as const, [])
const view = atom({ plugin: 'tool-lights', key: 'view' } as const, 'all')

/** Turn one `watch` entry into a regular expression: `*` matches anything */
function toPattern(entry: string): RegExp {
  const escaped = entry
    .split('*')
    .map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp('^' + escaped + '$')
}

/** A fresh, never-called light */
function newLight(label: string): Light {
  return { label, status: 'idle', count: 0, inFlight: 0, lastAt: 0, glowUntil: 0 }
}

/** `3s`, `4m`, `2h` since a time, or `-` */
function ago(now: number, at: number): string {
  if (at === 0) return '-'
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 60) return s + 's'
  const m = Math.round(s / 60)
  if (m < 60) return m + 'm'
  return Math.round(m / 60) + 'h'
}

/**
 * Split a label into the group it belongs to and a short name:
 *   mcp__plugin_jec-index_jec__symbol  → jec-index / symbol
 *   mcp__github__create_issue          → github / create_issue
 *   skill:deliberate:deliberate        → deliberate / /deliberate
 *   Bash                               → tools / Bash
 */
function split(label: string): { group: string; name: string } {
  let m = /^mcp__plugin_(.+?)_(.+?)__(.+)$/.exec(label)
  if (m) return { group: m[1]!, name: m[3]! }
  m = /^mcp__(.+?)__(.+)$/.exec(label)
  if (m) return { group: m[1]!, name: m[2]! }
  m = /^skill:(?:(.+?):)?(.+)$/.exec(label)
  if (m) return { group: m[1] ?? 'skills', name: '/' + m[2] }
  return { group: 'tools', name: label }
}

/** Cut a string to fit a width, keeping its end */
function fit(s: string, width: number): string {
  return s.length > width ? '…' + s.slice(-(width - 1)) : s
}

/** Change one light, adding it on first sight */
async function touch($: EngineInterface, label: string, fn: (light: Light) => Light) {
  await update($, lights, all => ({ ...all, [label]: fn(all[label] ?? newLight(label)) }))
}

/** Settle a light to its final color now, glowing bright for GLOW_MS first */
async function flash($: EngineInterface, label: string, status: Light['status']) {
  const now = await $.clock.now()
  await touch($, label, light => ({
    ...light,
    status,
    inFlight: Math.max(0, light.inFlight - 1),
    glowUntil: now + GLOW_MS,
  }))
  $.clock.after(GLOW_MS + 50, () => $.ui.invalidate('ui.render'))
}

/** Pin or unpin a label, and remember it for the next session */
async function togglePin($: EngineInterface, label: string) {
  let list: string[] = []
  await update($, pins, current => {
    list = current.includes(label) ? current.filter(one => one !== label) : [...current, label]
    return list
  })
  await $.store.set('pins', list)
}

/** Put every light back to never-called, keeping the rows */
async function resetAll($: EngineInterface) {
  await update($, lights, all => Object.fromEntries(Object.keys(all).map(label => [label, newLight(label)])))
}

export const register: Register = (on, options) => {
  // What the person asked to watch: 'auto', explicit names, * patterns, or a mix
  const entries = String(options.watch ?? 'auto')
    .split(',')
    .map(one => one.trim())
    .filter(Boolean)
  const isAuto = entries.includes('auto')
  const patterns = entries.filter(one => one !== 'auto').map(toPattern)
  const fixed = entries.filter(one => one !== 'auto' && !one.includes('*'))
  const showsStrip = options.show_strip !== false
  const opensOnStart = options.open_on_start === true

  /** Whether a label (a tool name, or `skill:<name>`) gets a light */
  const watches = (label: string): boolean => {
    if (patterns.some(p => p.test(label))) return true
    if (!isAuto) return false
    // auto: every MCP tool a plugin bundles, and every skill a plugin provides
    if (label.startsWith('mcp__plugin_')) return true
    if (label.startsWith('skill:') && label.slice(6).includes(':')) return true
    return false
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tool-lights',
      description: 'Open the tool-lights pane. "/tool-lights reset" clears the counts.',
      immediate: true,
    })
    // Pins the person made in an earlier session
    const savedPins = await $.store.get('pins')
    if (Array.isArray(savedPins)) {
      const list = savedPins.filter((one): one is string => typeof one === 'string')
      await update($, pins, () => list)
    }
    // Seed a dim light for everything watched that already exists: the names
    // the person listed, every registered tool that matches, and every
    // plugin skill that matches, so the strip is full before the first call
    const labels = [...fixed]
    const tools = await $.tool.list()
    for (const tool of tools) if (watches(tool.name)) labels.push(tool.name)
    const commands = await $.command.list()
    for (const command of commands) {
      if (command.plugin === undefined) continue
      const label = 'skill:' + command.name
      if (watches(label)) labels.push(label)
    }
    if (labels.length > 0) {
      await update($, lights, all => {
        const seeded = { ...all }
        for (const label of labels) seeded[label] ??= newLight(label)
        return seeded
      })
    }
    if (opensOnStart) void $.ui.open({ id: PANE, title: 'Tool lights' })
    return next(e)
  })

  on('command.run', { command: 'tool-lights' }, async ($, e) => {
    if (e.args.trim() === 'reset') {
      await resetAll($)
      return { text: 'Tool lights reset.' }
    }
    await $.ui.open({ id: PANE, title: 'Tool lights', closeOnEscape: true })
    return {}
  })

  // A tool call: amber while it runs, green when it returns, red when it fails
  on('tool.call', async ($, e, next) => {
    if (!watches(e.tool)) return next(e)
    const now = await $.clock.now()
    await touch($, e.tool, light => ({
      ...light,
      status: 'running',
      count: light.count + 1,
      inFlight: light.inFlight + 1,
      lastAt: now,
    }))
    const ran = await next(e)
    const failed = ran.deny !== undefined || ran.isError === true
    await flash($, e.tool, failed ? 'failed' : 'ok')
    return ran
  }).catch(async (_, e, next) => next(e)) // never block a tool because a light failed to update

  // A skill Claude loads through the Skill tool. Where an organization's
  // policy mod is seated, skill.prompt passes user mods by, so this is the
  // hook that still sees the skill there.
  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    const label = 'skill:' + e.skill
    if (!watches(label)) return next(e)
    const now = await $.clock.now()
    seen.set(label, now)
    await touch($, label, light => ({ ...light, count: light.count + 1, lastAt: now }))
    const ran = await next(e)
    await flash($, label, ran.deny !== undefined || ran.isError === true ? 'failed' : 'ok')
    return ran
  }).catch(async (_, e, next) => next(e))

  // A skill expanded for Claude, whether Claude loaded it or the person typed
  // /name. One the Skill tool hook just counted is not counted twice.
  on('skill.prompt', async ($, e, next) => {
    const label = 'skill:' + e.skill
    if (!watches(label)) return next(e)
    const now = await $.clock.now()
    const justSeen = (seen.get(label) ?? 0) > now - DEDUPE_MS
    seen.set(label, now)
    if (justSeen) return next(e)
    await touch($, label, light => ({ ...light, count: light.count + 1, lastAt: now }))
    await flash($, label, 'ok')
    return next(e)
  })

  // The strip: one line above the prompt. Each plugin is its name and a dot per
  // tool; a pinned tool is spelled out with its count. It fits the width by
  // leaving out groups, idle ones first.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rest = await next(e)
    if (!showsStrip || e.props.hasSurvey) return rest
    const all = await read($, lights)
    const pinned = await read($, pins)
    const rows = Object.values(all)
    if (rows.length === 0) return rest
    const { Box, Text, Button } = $.ui.resolve(e)
    const now = await $.clock.now()
    const width = Math.max(24, e.props.bodyColumns ?? 80)

    const dot = (light: Light) => {
      if (light.status === 'running') return <Text color="warning" bold>◐</Text>
      if (light.status === 'failed') return <Text color="error" bold>●</Text>
      if (light.status === 'ok' && light.glowUntil > now) return <Text color="success" bold>●</Text>
      if (light.status === 'ok') return <Text color="success">●</Text>
      return <Text dimColor>○</Text>
    }

    // Pinned lights first, spelled out; then every other group as name + dots
    const pinnedRows = pinned.map(label => all[label]).filter((one): one is Light => one !== undefined)
    const groups = new Map<string, Light[]>()
    for (const light of rows) {
      if (pinned.includes(light.label)) continue
      const { group } = split(light.label)
      groups.set(group, [...(groups.get(group) ?? []), light])
    }

    type Item = { width: number; isActive: boolean; draw: () => ReturnType<typeof Box> }
    const items: Item[] = []
    for (const light of pinnedRows) {
      const text = split(light.label).name + (light.count > 0 ? ' ' + light.count : '')
      items.push({
        width: 1 + text.length,
        isActive: true,
        draw: () => (
          <Box>
            {dot(light)}
            <Text dimColor={light.status === 'idle'}>{text}</Text>
          </Box>
        ),
      })
    }
    for (const [group, list] of groups) {
      items.push({
        width: group.length + 1 + list.length,
        isActive: list.some(one => one.status !== 'idle'),
        draw: () => (
          <Box>
            <Text dimColor>{group} </Text>
            {list.map(light => dot(light))}
          </Box>
        ),
      })
    }

    // Fit the width: the mark, the items with a 2-cell gap, and the expand button
    const budget = width - 2 - 12
    let used = 0
    const shown = new Set<Item>()
    for (const item of [...items].sort((a, b) => Number(b.isActive) - Number(a.isActive))) {
      if (used + item.width + 2 > budget) continue
      used += item.width + 2
      shown.add(item)
    }
    const ordered = items.filter(item => shown.has(item))
    const hidden = items.length - ordered.length

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" columnGap={2}>
          <Text color="claude">◆</Text>
          {ordered.map(item => item.draw())}
          {hidden > 0 && <Text dimColor>+{hidden}</Text>}
          <Button
            key="expand"
            label="expand"
            plain
            dimColor
            onPress={() => $.ui.open({ id: PANE, title: 'Tool lights', focus: true, closeOnEscape: true })}
          />
        </Box>
        {rest}
      </Box>
    )
  })

  // The pane: every light by group, with a pin on each row
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const all = await read($, lights)
    const pinned = await read($, pins)
    const mode = await read($, view)
    const now = await $.clock.now()
    const width = Math.max(28, e.props.bodyColumns ?? 48)
    const used = Object.values(all).filter(one => one.count > 0).length

    const dot = (light: Light) => {
      if (light.status === 'running') return <Text color="warning" bold>◐</Text>
      if (light.status === 'failed') return <Text color="error" bold>●</Text>
      if (light.status === 'ok' && light.glowUntil > now) return <Text color="success" bold>●</Text>
      if (light.status === 'ok') return <Text color="success">●</Text>
      return <Text dimColor>○</Text>
    }

    // Columns: indent 1 · dot 1 · name · count 3 · ago 4 · pin 1, single gaps between
    const nameWidth = Math.max(8, width - 2 - (1 + 1 + 1 + 1 + 3 + 1 + 4 + 1 + 1))

    const groups = new Map<string, Light[]>()
    for (const light of Object.values(all)) {
      const isPinned = pinned.includes(light.label)
      if (mode === 'active' && light.status === 'idle' && !isPinned) continue
      const group = isPinned ? '★ pinned' : split(light.label).group
      groups.set(group, [...(groups.get(group) ?? []), light])
    }
    // Pinned first, then the rest in the order they appeared
    const ordered = [...groups.entries()].sort(([a], [b]) => Number(b === '★ pinned') - Number(a === '★ pinned'))

    const row = (light: Light) => {
      const isPinned = pinned.includes(light.label)
      return (
        <Box flexDirection="row" columnGap={1}>
          <Text> </Text>
          {dot(light)}
          <Box width={nameWidth}>
            <Text wrap="truncate-start" dimColor={light.status === 'idle'}>
              {fit(split(light.label).name, nameWidth)}
            </Text>
          </Box>
          <Box width={3} justifyContent="flex-end">
            <Text dimColor>{light.count > 0 ? String(light.count) : ''}</Text>
          </Box>
          <Box width={4} justifyContent="flex-end">
            <Text dimColor>{ago(now, light.lastAt)}</Text>
          </Box>
          <Button
            key={'pin:' + light.label}
            label={isPinned ? '★' : '☆'}
            plain
            dimColor={!isPinned}
            onPress={() => togglePin($, light.label)}
          />
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" columnGap={2} width={width - 2}>
          <Text bold>Tool lights</Text>
          <Text dimColor>{used > 0 ? used + ' used' : ''}</Text>
          <Box flexGrow={1} />
          <Button
            key="view"
            label={mode === 'all' ? 'active' : 'all'}
            hotkey="a"
            plain
            dimColor
            onPress={() => update($, view, (current): View => (current === 'all' ? 'active' : 'all'))}
          />
          <Button key="reset" label="reset" hotkey="r" plain dimColor onPress={() => resetAll($)} />
        </Box>
        {ordered.length === 0 && (
          <Text dimColor>{mode === 'active' ? 'Nothing has been called yet.' : 'Waiting for a plugin tool or skill.'}</Text>
        )}
        {ordered.map(([group, list]) => (
          <Box flexDirection="column">
            <Text> </Text>
            <Text bold dimColor={group !== '★ pinned'}>
              {group}
            </Text>
            {list.map(row)}
          </Box>
        ))}
      </Box>
    )
  })
}
