# webdev-pro

A Claude Code plugin that packages the working habits people like in frontier agent models — judging UI by looking at it, making the right call on vague instructions, and not saying "done" until it's verified — as skills, hooks and an agent.

## What's in it

| Piece | Kind | What it does |
|---|---|---|
| `/webdev-pro:visual-qa [route]` | skill | Starts/reuses the dev server, screenshots pages at phone (390px) and desktop (1440px) with Playwright, flags overflow, broken images, `undefined`/`NaN` text, console errors and failed requests, then has Claude *look at the PNGs* and fix what it sees. |
| `/webdev-pro:clarify` | skill | Before building from an underspecified request: inspect the repo, list assumptions, ask only about the expensive-to-reverse ones (max three, each with a default), decide the rest. |
| `/webdev-pro:verify-done` | skill | Typecheck → lint → tests → build → visual check, reading real output, before reporting a task finished. |
| `/webdev-pro:ship` | skill | The whole pre-merge pass: checks, visual QA, fresh-eyes review, diff sanity, four-line handoff. |
| `@agent-webdev-pro:ui-critic` | agent | A reviewer that has not seen the code. Give it screenshot paths; it returns a ranked defect list and a verdict. |
| Stop hook | hook | If web source files were edited and no test/lint/build/typecheck/screenshot ran afterwards, Claude is sent back to verify once before it can finish. Blocks once per batch of edits; never loops. |
| SessionStart hook | hook | Injects a short habits note once per session (clarify first, token discipline, look at screenshots, verify before done). |

## Install

**Try it for one session**

```bash
claude --plugin-dir /path/to/webdev-pro
```

**Install for good (local marketplace)**

```bash
mkdir -p ~/claude-plugins/plugins
cp -r /path/to/webdev-pro ~/claude-plugins/plugins/
cat > ~/claude-plugins/.claude-plugin/marketplace.json <<'EOF'
{
  "name": "my-plugins",
  "owner": { "name": "me" },
  "description": "Personal Claude Code plugins",
  "plugins": [
    { "name": "webdev-pro", "source": "./plugins/webdev-pro", "description": "Web-dev discipline: visual QA, clarify, verify-before-done" }
  ]
}
EOF
claude plugin validate ~/claude-plugins
claude plugin marketplace add ~/claude-plugins
claude plugin install webdev-pro@my-plugins --scope user
```

(`mkdir -p ~/claude-plugins/.claude-plugin` first if the heredoc complains.) Inside a session, `/plugin` shows what's loaded and `/reload-plugins` picks up edits.

## Requirements

- Node 18+ (hooks and the screenshot script are plain Node, no dependencies).
- For visual QA, Playwright in the project: `npm i -D playwright && npx playwright install chromium`. The script tells you exactly this if it's missing.
- Add `.webdev-pro/` to the project's `.gitignore` (screenshots land there).

## Tuning

- **Which files count as "web source"** and **which commands count as a check** are two regexes at the top of `hooks/lib.mjs`.
- To disable the Stop gate, delete the `Stop` block in `hooks/hooks.json`.
- Viewports live in `scripts/snap.mjs` (`VIEWPORTS`). Add `tablet` or change sizes there.
- Hook state is stored under `$CLAUDE_PLUGIN_DATA` (or the OS temp dir), one small JSON file per session.

## How the Stop gate decides

`track-edit.mjs` records edited web files per session. `track-check.mjs` clears that list whenever a Bash command matches a test/lint/typecheck/build/screenshot pattern. `stop-gate.mjs` blocks the stop once if the list is non-empty, then clears it so the next stop goes through — so if you really do want to skip, tell Claude and it will say so and finish.
