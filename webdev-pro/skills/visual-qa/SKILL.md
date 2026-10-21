---
name: visual-qa
description: Screenshot the running app at desktop and phone widths, look at the images, and fix layout, spacing, contrast, overflow and console errors before calling frontend work done. Use after any change to a page, component, layout, style, or route, or when the user asks "does it look right", "check the UI", or "/webdev-pro:visual-qa [url]".
argument-hint: "[url or route, e.g. /dashboard]"
allowed-tools: Bash Read Edit Write Glob Grep
---

# Visual QA

You are judging the UI with your eyes, not by reading the code. Code that compiles can still render badly. Do not report frontend work as finished until you have looked at screenshots of it.

## 1. Get the app running

- Find the dev command: check `package.json` scripts (`dev`, `start`, `serve`, `preview`). Note the port it prints.
- If a server is already up (check with `curl -s -o /dev/null -w '%{http_code}' http://localhost:PORT`), reuse it.
- Otherwise start it in the background with `Bash` and `run_in_background: true`, then poll until it answers (up to ~30s).
- Static sites with no dev script: `npx -y serve -l 4173 <dir>`.

## 2. Capture

Run the bundled script. It screenshots every URL at a phone and a desktop viewport and records console errors and failed requests:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/snap.mjs" --out .webdev-pro/shots http://localhost:PORT/ http://localhost:PORT/other-route
```

- Pass the route the user asked about (`$ARGUMENTS` if given), plus any page you touched.
- Flags: `--full` for full-page captures, `--wait 1500` to wait for animations, `--viewports phone,tablet,desktop`.
- If the script says Playwright is missing, run the command it prints (`npx playwright install chromium` inside the project, or `npm i -D playwright`), then retry. Do not skip the capture.
- It writes `<out>/report.json` plus `<out>/<page>-<viewport>.png`. Add `.webdev-pro/` to `.gitignore` if it is not already.

## 3. Look, then judge

`Read` each PNG. You will see the image. Check, in this order:

1. **Broken**: blank page, error overlay, missing images, unstyled HTML, text that says "undefined" or "NaN".
2. **Overflow**: horizontal scrollbar on phone, text cut off, elements escaping their container, buttons wrapping badly. `report.json` has `horizontalOverflow` and `missingViewportMeta` per page so you don't have to guess.
3. **Hierarchy**: can you tell what the page is for in one second? One clear primary action? Headings that step down in size?
4. **Spacing**: consistent rhythm, nothing touching the edge, no orphaned elements floating in empty space.
5. **Contrast and legibility**: light-gray-on-white text, tiny tap targets on phone, placeholder-only inputs.
6. **States**: empty states, loading, errors, long text, long lists (if you can reach them cheaply).
7. **Console**: `report.json` lists console errors and 4xx/5xx requests. A React key warning or a 404 asset counts as a defect.

For a second opinion with fresh eyes, hand the screenshots to the `webdev-pro:ui-critic` agent and read its list.

## 4. Fix and re-check

Fix what you found, re-run the capture, and look again. Stop when a pass finds nothing in categories 1 to 3 and nothing new in 4 to 7.

## 5. Report

Tell the user, in a few lines: what you checked (routes, viewports), what you fixed, and anything you chose to leave (with a reason). Mention the screenshot folder so they can look too. Do not paste the checklist back.
