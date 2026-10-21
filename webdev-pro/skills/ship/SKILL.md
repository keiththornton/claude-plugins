---
name: ship
description: The full pre-ship pass for a web change in one command — verify-done checks, visual QA at phone and desktop, a fresh-eyes ui-critic review, and a short handoff summary. Use when the user runs /webdev-pro:ship or says "is this ready", "ready to merge", "wrap this up".
argument-hint: "[routes to check, e.g. / /pricing]"
user-invocable: true
---

# Ship

Run these in order. Don't skip a step because the previous one was green.

1. **Checks** — follow the `webdev-pro:verify-done` skill (typecheck, lint, tests, build). Stop here and fix if anything fails.
2. **Visual QA** — follow the `webdev-pro:visual-qa` skill for the routes in `$ARGUMENTS` plus every page touched in this session. Fix blockers and majors.
3. **Fresh eyes** — spawn the `webdev-pro:ui-critic` agent with the screenshot folder and `report.json`. Fix anything it marks blocker or major. Minors: fix if under five minutes, otherwise list them.
4. **Diff sanity** — `git status` and `git diff --stat`. Make sure nothing unintended is in the change (stray screenshots, debug logs, a lockfile churn you didn't mean). `.webdev-pro/` should be gitignored.
5. **Handoff** — report in this shape:

```
Changed: <one line>
Verified: typecheck ✓ lint ✓ tests ✓ (N passed) build ✓ · screenshots: /, /pricing @ phone+desktop · critic: ship
Left open: <minor items or "none">
Next: <one real step, or omit>
```

If step 3's verdict is "not ready", say so and list why. Don't soften it.
