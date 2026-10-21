// Shared helpers for webdev-pro hooks. Hooks read one JSON object from stdin.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const WEB_EXT = /\.(tsx?|jsx?|mjs|cjs|vue|svelte|astro|html?|css|scss|sass|less|styl|mdx|json)$/i;
export const CHECK_CMD =
  /\b(vitest|jest|mocha|ava|playwright test|cypress run|tsc\b|vue-tsc|svelte-check|eslint|biome (check|lint)|stylelint|prettier --check|(npm|pnpm|yarn|bun)( run)? (test|lint|build|typecheck|type-check|check|e2e)\b|(next|vite|astro|nuxt|remix|svelte-kit|webpack|turbo) build|snap\.mjs)/;

export function readInput() {
  try {
    const raw = readFileSync(0, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function stateDir() {
  const base = process.env.CLAUDE_PLUGIN_DATA || join(tmpdir(), "webdev-pro");
  mkdirSync(base, { recursive: true });
  return base;
}

export function loadState(sessionId) {
  const file = join(stateDir(), `${sessionId || "default"}.json`);
  let state = { dirty: [], lastEdit: 0, lastCheck: 0, lastCheckCmd: null, greeted: false };
  if (existsSync(file)) {
    try {
      state = { ...state, ...JSON.parse(readFileSync(file, "utf8")) };
    } catch {
      /* corrupt state, start over */
    }
  }
  return { file, state };
}

export function saveState(file, state) {
  try {
    writeFileSync(file, JSON.stringify(state));
  } catch {
    /* never fail the hook over state */
  }
}

export function out(obj) {
  process.stdout.write(JSON.stringify(obj));
}
