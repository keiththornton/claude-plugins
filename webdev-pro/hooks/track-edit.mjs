#!/usr/bin/env node
// PostToolUse on Edit|Write|MultiEdit|NotebookEdit: remember that a web source file changed.
import { WEB_EXT, loadState, readInput, saveState } from "./lib.mjs";

const input = readInput();
const ti = input.tool_input || {};
const path = ti.file_path || ti.notebook_path || ti.path || "";
if (!path || !WEB_EXT.test(path)) process.exit(0);
// Ignore edits to the QA output folder and lockfiles.
if (/[\\/]\.webdev-pro[\\/]|lock\.json$|\.lock$/.test(path)) process.exit(0);

const { file, state } = loadState(input.session_id);
if (!state.dirty.includes(path)) state.dirty.push(path);
state.lastEdit = Date.now();
saveState(file, state);
