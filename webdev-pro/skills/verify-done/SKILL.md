---
name: verify-done
description: The checklist to run before reporting any web-dev task as finished — typecheck, lint, tests, build, and a visual check for UI changes. Use when about to say "done", when the Stop hook asks for verification, or when the user runs /webdev-pro:verify-done or /webdev-pro:ship.
user-invocable: true
allowed-tools: Bash Read Glob Grep
---

# Verify before done

"It should work" is not a status. Run the checks, read the output, and report what actually passed.

## 1. Find the project's checks

Read `package.json` scripts once. Map what exists:
- typecheck: `typecheck`, `tsc --noEmit`, `check` (Svelte), `vue-tsc`
- lint: `lint`, `eslint .`, `biome check`
- tests: `test`, `test:unit`, `vitest run`, `jest`, `playwright test`
- build: `build`

If a check isn't defined, don't invent one, but say so in the report ("no test script in this repo").

## 2. Run them, cheapest first

Typecheck → lint → unit tests → build → e2e (only if the project has them and the change touched a flow they cover).

- Run with `Bash`. Read the real output; don't trust exit code alone when output is suspiciously short.
- Scope where you can: `vitest run src/components/Nav` is better than the whole suite for a small change. Run the full suite before a final "done" on anything non-trivial.
- A warning that was introduced by this change counts. Pre-existing warnings don't, but mention them once.

## 3. If the change touched anything rendered

Pages, components, layouts, styles, routes, images: run the `visual-qa` skill. A green typecheck tells you nothing about a button overlapping a header.

## 4. Confirm the files

`Glob`/`Read` the files you claim to have created or changed. Confirm the import you added resolves. Confirm nothing you deleted is still referenced (`Grep` for the old name).

## 5. Report

Four lines maximum:
- What changed (files or feature, not a diff narration).
- What was verified: list each check with pass/fail, and the viewports screenshotted if applicable.
- What was not verified and why.
- One next step if there is a real one.

A failed check is reported as failed, with the error, and the task is not "done". Never say "all tests pass" without having run them in this session after the last edit.
