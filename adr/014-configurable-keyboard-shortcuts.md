# ADR-014: Configurable Keyboard Shortcuts

**Status:** Accepted
**Date:** 2026-03-08

## Context

After moving to the apps/scripts array config (ADR-013), keyboard shortcuts were initially assigned positionally — the first app got `cmd+o`, the second `cmd+t`, etc. This meant reordering apps in the config would silently change shortcuts, breaking muscle memory.

## Decision

Keyboard shortcuts are defined per-item, not per-position:

- **String shorthands** get fixed default shortcuts: `editor` → `cmd+o`, `terminal` → `cmd+t`, `finder` → `cmd+f`, `git` → `cmd+g`, `browser` → `cmd+b`
- **Custom app/script entries** have no shortcut by default, but can specify one via the `shortcut` field (e.g. `"shortcut": "cmd+k"`)
- Shortcut strings use the format `modifier+modifier+key` (e.g. `"cmd+shift+k"`, `"ctrl+x"`)

## Implementation

- Shortcuts are stored as strings in the config and on `ResolvedApp`/`ResolvedScript`
- `parseShortcut()` in `src/shortcuts.ts` converts the string to Raycast's `Keyboard.Shortcut` type
- Shortcuts are applied in both the project list (quick actions in the context menu) and the project actions view

## Rationale

- Shortcuts are stable regardless of item order in the config
- Shorthands preserve the familiar defaults from before the restructure
- Custom entries opt-in to shortcuts — no accidental conflicts
- String format (`"cmd+t"`) is readable and easy to type in JSON
