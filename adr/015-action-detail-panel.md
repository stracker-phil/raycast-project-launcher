# ADR-015: Detail Panel for Action List

**Status:** Accepted
**Date:** 2026-03-09

## Context

The project-actions view (Enter on a project → action list, per ADR-007) showed only action names and icons. Users had no way to see what a command actually does before executing it, or to discover keyboard shortcuts and environment variables without opening the config file.

## Decision

Enable `isShowingDetail` on the project-actions List to show a detail panel for each action item. The panel uses two rendering strategies:

1. **Markdown + Metadata** (apps and scripts) — command preview in a code block at the top, structured metadata below (type, app name, shortcut, environment variables).
2. **Markdown only** (Edit Config action) — a config syntax reference showing sample app and script entries with all available fields, variable substitution examples, and shorthand list.

## Implementation

Each `ActionItem` carries an `ActionDetail` object with: `type`, `app?`, `command?`, `shortcutLabel?`, `markdown?`.

The `actionDetail()` function renders:
- If `markdown` is set: full markdown panel (used for the config reference)
- Otherwise: command preview as a code block (the shell command, or `open -a "AppName"` for app launchers) with metadata section showing type, app, shortcut, and project env vars

### Action types displayed

| Type | Shown for | Preview |
|------|-----------|---------|
| App Launcher | Apps with `app` field | `open -a "AppName"` |
| Terminal Session | Apps with `command` field | The shell command |
| Background Script | Scripts | The shell command |
| Manage | Edit Project, Edit Config | No command preview / config reference |

### Environment variables

Project env vars (from `config.env`) are shown in the metadata section for app and script actions, since they are injected into all command executions. Hidden for Manage actions.

## Rationale

- Users can verify what a command does before running it
- Keyboard shortcuts are discoverable without memorizing config
- The config reference on "Edit Config" provides inline documentation at the point of use
- Markdown + metadata split gives both a scannable command preview and structured details

## Trade-offs

- Action list items are narrower with the detail panel (acceptable since action labels are short)
- Config reference is static text — not auto-generated from the schema
