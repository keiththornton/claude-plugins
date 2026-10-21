#!/usr/bin/env node
// Stop: if web source files were edited and no check has run since, ask Claude to verify before finishing.
import { loadState, out, readInput, saveState } from "./lib.mjs";

const input = readInput();
// Already continuing because of a stop hook: never loop.
if (input.stop_hook_active) process.exit(0);

const { file, state } = loadState(input.session_id);
const dirty = state.dirty.filter(Boolean);
if (!dirty.length) process.exit(0);

// Block once per batch of edits. Clear so a second stop (e.g. the user says "skip it") goes through.
state.dirty = [];
saveState(file, state);

const shown = dirty.slice(0, 6).map((p) => p.replace(input.cwd ? input.cwd + "/" : "", ""));
const more = dirty.length > shown.length ? ` and ${dirty.length - shown.length} more` : "";
const rendered = dirty.some((p) => /\.(tsx?|jsx?|vue|svelte|astro|html?|css|scss|sass|less|mdx)$/i.test(p));

out({
  decision: "block",
  reason:
    `webdev-pro: ${dirty.length} web source file(s) changed since the last check (${shown.join(", ")}${more}) ` +
    `and no typecheck/lint/test/build has run since. Follow the webdev-pro:verify-done skill: run the project's checks and read the output` +
    (rendered ? ", and since rendered files changed, run webdev-pro:visual-qa and look at the screenshots" : "") +
    `. If the user explicitly asked you to skip verification, say so in one line and stop.`,
});
