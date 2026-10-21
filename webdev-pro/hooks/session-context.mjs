#!/usr/bin/env node
// SessionStart: inject a short set of working habits once per session.
import { loadState, out, readInput, saveState } from "./lib.mjs";

const input = readInput();
const { file, state } = loadState(input.session_id);
if (state.greeted) process.exit(0);
state.greeted = true;
saveState(file, state);

const context = [
  "webdev-pro is active. Working habits for this session:",
  "- Before building anything from a vague request, run the webdev-pro:clarify habit: look at the repo first, ask at most three expensive-to-reverse questions with defaults, decide the rest.",
  "- Token discipline: read only the files the task needs (use Grep/Glob to find them, Read with offset/limit for big files); don't re-read files you've already seen unless they changed; batch independent tool calls in one turn; don't narrate between steps.",
  "- After changing anything rendered, run webdev-pro:visual-qa and actually look at the PNGs before saying it's done.",
  "- Before reporting done, run the project's checks (webdev-pro:verify-done). A Stop hook will remind you if you forget.",
  "- /webdev-pro:ship does the full pre-merge pass.",
].join("\n");

out({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context } });
