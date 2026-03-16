# ADR-022: Dedicated Filter Commands and Per-View Selection Memory

**Status:** Accepted
**Date:** 2026-03-16

## Context

The project list supports three-tier filtering (Starred / All Projects / Archived) via a dropdown inside the single `list-projects` command. But accessing a specific tier always required opening the list first, then selecting the filter — even when the user's intent was already known (e.g. "I want to see my starred projects").

A secondary problem emerged once multiple filter-scoped entry points existed: all views shared a single `lastOpenedProjectId` key in LocalStorage. Opening a starred project in one view would then re-select that project when returning to a different view where it might not even be visible.

## Decision

Add three dedicated Raycast commands alongside the existing one:

| Command | Title | Initial filter |
|---|---|---|
| `list-projects` | Recent Projects | Restored from `lastFilter` (last used) |
| `starred-projects` | Starred Projects | Always `starred` |
| `archived-projects` | Archived Projects | Always `archived` |
| `all-projects` | All Projects | Always `all` |

The main list logic is extracted into a shared `ProjectList` component (named export from `list-projects.tsx`) that accepts `initialFilter?: string` and `initialProjectId?: string`. Each command file is a thin wrapper rendering `<ProjectList initialFilter="..." />`.

Per-view selection memory: `lastOpenedProjectId` in LocalStorage is namespaced by view. The key is `lastOpenedProjectId:<initialFilter>` for filter commands and the bare `lastOpenedProjectId` for "Recent Projects" (backward-compatible).

## Implementation

- `ProjectList` receives `initialFilter` as a prop; `useState` is initialized to `initialFilter ?? "all"`
- The saved-filter restoration (`lastFilter`) is skipped when `initialFilter` is provided — filter commands always open to their fixed filter
- The user can still change the filter dropdown in any view; changes are saved to `lastFilter` as usual
- `getLastOpenedProjectId(viewId?)` and `setLastOpenedProjectId(id, viewId?)` in `storage.ts` accept an optional view namespace matching `initialFilter`

## Rationale

- Dedicated commands appear in Raycast root search and can be assigned global hotkeys, eliminating the filter-selection step
- The `ProjectList` refactor avoids code duplication — all four views share identical rendering logic, only the entry-point filter differs
- Per-view selection memory is necessary because each view is an independent browsing context; a project selected in "Starred Projects" is not meaningful as the default selection in "Archived Projects"
- "Recent Projects" retains the saved-filter restore behavior because its purpose is to resume wherever the user left off

## Trade-offs

- Four commands in the extension's command list — users may find this noisy if they only use one entry point. Mitigated by the commands being clearly named and independently useful.
- `lastFilter` persists even when the user changes the filter inside a dedicated filter command (e.g. switches away from "starred" while in the Starred Projects view). This is acceptable — it reflects genuine user intent and will only affect "Recent Projects" on next open.
