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

Each `ActionItem` carries an `ActionDetail` object with: `type`, `app?`, `args?`, `command?`, `url?`, `shortcutLabel?`, `markdown?`, `state?`.

The `actionDetail()` function renders:
- If `markdown` is set: full markdown panel (used for the config reference)
- Otherwise: command preview as a code block with metadata section showing type, app name, shortcut, and project env vars

### Action types displayed

| Type | Shown for | Preview |
|------|-----------|---------|
| App Launcher | All `apps[]` entries | The shell command, URL, or app binary |
| Background Script | Scripts | The shell command + current state tag (if stateful, see ADR-023) |
| Manage | Edit Project, Edit Config | No command preview / config reference |

### App name display

All App Launcher items show a human-readable "App" row (always in second position, after "Type"), derived from whichever launch field is set:

- `app` field: CLI binary mapped to product name via a lookup table (`phpstorm → PhpStorm`, `smerge/repo → Sublime Merge`, `edit → Edit`). Unknown binaries show as-is.
- `url` field: URL protocol mapped to app name (`http:`/`https:` → `Browser`, `obsidian:` → `Obsidian`). Unknown protocols show the raw URL.
- `command` field: always displays `Terminal`.

The mapping lives in `src/shortcuts.ts` (`CLI_APP_NAMES`, `URL_PROTOCOL_NAMES`) alongside `friendlyCliName()`, `friendlyUrlName()`, and `friendlyAppName()`.

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
