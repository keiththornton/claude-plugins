---
name: clarify
description: Before building a feature, page or change from an underspecified request, surface the assumptions that would be expensive to get wrong and decide which to ask about and which to just make. Use when a web-dev request leaves real room for interpretation ("add auth", "make a settings page", "redesign the nav", "add dark mode"), or when the user runs /webdev-pro:clarify.
argument-hint: "[the request, if not already in the conversation]"
user-invocable: true
---

# Clarify before building

Good judgment on vague instructions is mostly about noticing which guesses are cheap to undo and which are not. This skill is a two-minute habit, not a questionnaire. Never produce a long list of questions.

## Step 1 — Look first, ask second

Spend a few tool calls learning what the codebase already decided for you:
- Framework, router, styling system (`package.json`, config files, one existing page/component).
- Existing patterns for the thing being asked: is there already a form component, an auth helper, a layout, a design-token file?
- Anything in `CLAUDE.md`, `README`, or a design system doc.

Half of the apparent ambiguity disappears here. Don't ask what the repo already answers.

## Step 2 — Write the assumptions list (to yourself)

For the request, list every choice you'd have to make. For each, mark:
- **Cost to reverse**: cheap (rename, restyle, move a button) vs expensive (data model, URL structure, auth approach, third-party service, public API shape, anything that touches persisted data or other people's code).
- **Confidence**: do the codebase conventions or the request itself make the answer obvious?

## Step 3 — Decide

- **Expensive + not obvious** → ask. Batch them into one short message, at most three questions, each with your recommended default so the user can just say "yes". Use `AskUserQuestion` if available.
- **Expensive + obvious** → proceed, and state the assumption in one line at the top of your work so it can be caught.
- **Cheap** → just pick the sensible option. Don't mention it unless the user asks.

If the user is not around (scheduled run, or they said "just do it"), take the most conventional reading, write the expensive assumptions at the top of your summary, and go.

## Step 4 — Build

Once you start, don't re-litigate. If you discover a new expensive fork mid-task, stop at a clean point, ask once, and continue.

## Example

Request: "add a settings page"

Codebase shows: Next.js app router, Tailwind, an existing `/account` route with a card layout, a `useUser()` hook, no form library.

Assumptions:
- Route `/settings` vs nested under `/account/settings` — expensive (URL, nav), not obvious → ask, recommend `/account/settings` to match the existing route.
- Which settings fields — expensive if it needs new DB columns, cheap if it's display name + email + theme from existing user fields → ask only if no user model exists; otherwise start with existing fields.
- Form handling — cheap, follow existing pattern (plain controlled inputs).
- Styling — cheap, reuse the card layout from `/account`.

Message to user: one question about the route, one about whether new fields need persisting, each with a default. Then build.
