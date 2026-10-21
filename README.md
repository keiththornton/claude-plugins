# claude-plugins

A Claude Code plugin marketplace (`keith-tools`):

| Plugin | What it does | Repo |
|---|---|---|
| `jec-index` | Persistent symbol + dependency index: read one symbol instead of a file, impact analysis, impacted-tests hook. | [keiththornton/jec-index](https://github.com/keiththornton/jec-index) |
| `node-runtime` | Live Node.js debugger (breakpoints, stepping, scopes, evaluate) over the V8 Inspector protocol. | [keiththornton/node-runtime-mcp](https://github.com/keiththornton/node-runtime-mcp) |
| `deliberate` | Working discipline for long tasks: `/deliberate` skill, verifier agent, checkpoint + finish-gate hooks. | [keiththornton/deliberate](https://github.com/keiththornton/deliberate) |
| `webdev-pro` | Web-dev discipline: Playwright visual QA at phone + desktop, `/clarify` before building, verify-before-done Stop hook, `ui-critic` agent, `/ship`. | [`./webdev-pro`](./webdev-pro) |

## Install

```bash
claude plugin marketplace add keiththornton/claude-plugins

claude plugin install jec-index@keith-tools --scope user
claude plugin install node-runtime@keith-tools --scope user
claude plugin install deliberate@keith-tools --scope user
claude plugin install webdev-pro@keith-tools --scope user
```

Use `--scope project` instead to install for one project only (recorded in that project's `.claude/settings.json`). Inside Claude Code the same commands work as `/plugin marketplace add …` and `/plugin install …`.

`jec-index` and `node-runtime` need Node 20+/18+ and git; each installs its own npm dependencies and builds itself the first time it starts (one-time, ~30 s). `deliberate` has no dependencies. `webdev-pro` needs Node 18+; its visual QA uses Playwright from the project being worked on (`npm i -D playwright && npx playwright install chromium`).

## Update

```bash
claude plugin marketplace update keith-tools
claude plugin update jec-index@keith-tools
claude plugin update node-runtime@keith-tools
claude plugin update deliberate@keith-tools
claude plugin update webdev-pro@keith-tools
```

## Remove

```bash
claude plugin uninstall jec-index@keith-tools --scope user   # etc.
claude plugin marketplace remove keith-tools
```
