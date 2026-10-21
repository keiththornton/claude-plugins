# tool-lights

A Claude Code mod that watches the tools, MCP servers, and skills you care about and shows each one as a light: **amber** while a call is in flight, **green** the moment it returns (bright for three seconds, then steady), **red** if the call was denied or errored.

It has two sizes:

- **The strip** — one line above the prompt. Each plugin is its name and a dot per tool, so `jec-index ●●○○  node-runtime ○○○  deliberate ○` tells you at a glance what's been hit. A tool you pin is spelled out with its count. When the line is too narrow for everything, idle groups drop off first and a `+N` says how many are hidden. Press **expand** (or run `/tool-lights`) to open the pane.
- **The pane** — the full view, grouped by plugin with short names (`symbol`, not `mcp__plugin_jec-index_jec__symbol`), a count and how-long-ago per row, and a ☆ on each row to pin it. Pinned rows sit in a **★ pinned** group at the top and are remembered across sessions. `a` toggles active-only, `r` resets the counts, Esc closes.

## Install

Requires Claude Code 2.1.287 or later.

Point Claude Code at the folder for one session:

```
claude --plugin-dir /path/to/tool-lights
```

Or load it every session (including the Desktop app) from `~/.claude/settings.json`:

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "/path/to/tool-lights" } }
```

## Use

- The strip is there from the first prompt. `/tool-lights` or its **expand** button opens the pane; Esc closes it.
- `/tool-lights reset` clears the counts.
- Pin a tool from the pane (the ☆ on its row, or Tab to it and press Enter). Pins persist in the mod's own store.

## Configure

Two options, set with `/plugin configure tool-lights` or under `pluginConfigs` in settings:

- **What to watch** (`watch`, default `auto`): comma-separated names or `*` patterns, matched against tool names and `skill:<name>`.
  - `auto` — every MCP tool bundled by a plugin (`mcp__plugin_*`) and every skill that belongs to a plugin (`skill:my-plugin:*`).
  - `mcp__my-server__*` — every tool from one MCP server.
  - `mcp__plugin_my-plugin_db__query` — one exact tool, seeded dim in the pane before its first call.
  - `skill:my-plugin:review` — one skill, whether Claude loads it or you type `/my-plugin:review`.
  - Mix them: `auto, Bash, mcp__github__*`.
- **Show the strip above the prompt** (`show_strip`, default on).
- **Open the pane at session start** (`open_on_start`, default off).

## Check it

```
claude plugin validate .
claude plugin test .
```
