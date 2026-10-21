#!/usr/bin/env node
// PostToolUse on Bash: if the command was a test/lint/typecheck/build/screenshot run, clear the dirty flag.
import { CHECK_CMD, loadState, readInput, saveState } from "./lib.mjs";

const input = readInput();
const cmd = String(input.tool_input?.command || "");
if (!CHECK_CMD.test(cmd)) process.exit(0);

const { file, state } = loadState(input.session_id);
state.dirty = [];
state.lastCheck = Date.now();
state.lastCheckCmd = cmd.slice(0, 120);
saveState(file, state);
