# ADR-013: Structured Config with Apps and Scripts Arrays

**Status:** Accepted
**Date:** 2026-03-08

## Context

The original config format used flat top-level fields (`editor`, `start`, `stop`, `url`, `scripts`) which made it hard to add new launchers (e.g. Claude Code in a terminal) or customise how individual items look. Every new launcher type required a code change and a new hardcoded field. The `scripts` object only supported background execution — there was no way to define interactive terminal sessions.

## Decision

Restructure `.project-launcher.json` into a nested format:

- **`name`** — project display name (top-level, unchanged)
- **`meta`** — visual/metadata object: `icon`, `color`, `url`, `notes`
- **`env`** — environment variables (top-level, unchanged)
- **`apps`** — array of launchers (silent CLI spawn or interactive terminal session)
- **`scripts`** — array of background commands (run via `execSync`, no terminal)

Apps support two launch modes determined by which field is set:
- `app` field → CLI binary spawned silently in a login shell with full project env vars. Optional `args` field overrides the project path with a specific file or path.
- `command` field → opened in a new interactive terminal session with env vars
- `url` field → opened in the default browser via Raycast's `open()`

Scripts always run in the background with no visible terminal.

Both apps and scripts support per-item `icon`, `color`, and `shortcut` fields.

## Implementation

- `apps` entries are either string shorthands (`"editor"`, `"terminal"`, `"git"`, `"browser"`, `"repoBrowser"`, `"claude"`) or full objects with `label`, `app`/`command`/`url`, `args`, `icon`, `color`, `shortcut`
- String shorthands expand using extension preferences (e.g. `"editor"` → `{ label: "Edit Code", app: "phpstorm", shortcut: "cmd+o" }`)
- `scripts` entries are objects with `label`, `command`, `icon`, `color`, `shortcut`, `state`, `hiddenStates` (see ADR-023 for stateful scripts)
- Variable substitution: `${dir}` (project path), `${url}` (`meta.url`), and `~` (home directory) are replaced in all `command`, `args`, and `url` fields
- The UI renders: Apps section → Scripts section → Manage section

## Rationale

- **Flexibility**: adding a new launcher is a config change, not a code change
- **Two execution modes** cover both "open an app silently" and "start an interactive CLI tool" without ambiguity
- **Shorthands** keep common entries concise while full objects allow complete customisation
- **Per-item visuals** let each action have its own icon and color in the list
- Moving `icon`, `color`, `url`, `notes` into `meta` keeps the top level clean and separates concerns
