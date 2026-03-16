# Dev Project Launcher

Raycast extension for managing and launching dev projects.

## Stack
- TypeScript + React (Raycast API)
- `@raycast/api` for UI components and storage

## Structure
- `src/list-projects.tsx` — Main list view, groups projects by tag, tag filter dropdown
- `src/project-actions.tsx` — Per-project action list with Info section (opened via Enter)
- `src/add-project.tsx` — Add/edit project form (path + meta fields, auto-detects existing config)
- `src/actions.ts` — App launchers, script runners, terminal helpers
- `src/config.ts` — Reads `.project-launcher.json`, expands shorthands, resolves config
- `src/storage.ts` — LocalStorage CRUD (project registration + UI state: `lastOpenedProjectId`, `lastFilter`, config cache)
- `src/shortcuts.ts` — Keyboard shortcut parsing (`parseShortcut`) and display rendering (`renderShortcut`)
- `src/types.ts` — Project, ProjectFileConfig, ResolvedConfig, preferences

## ADRs
Architecture Decision Records live in `adr/`. Read relevant ADRs before changing core behavior. Key decisions:
- ADR-001: Split storage (LocalStorage for registration, JSON file for config)
- ADR-002: Cascading config resolution (file > preferences > fallback)
- ADR-007: Two-tier action UI (Enter → action list, context menu → shortcuts)
- ADR-008: Deep links + quicklinks for direct project access
- ADR-012: Tag filter dropdown on project list (+ starred/archived filters)
- ADR-020: Project archiving (hide/show via meta.archived flag)
- ADR-021: Project starring and three-tier filtering (starred/all/archived)
- ADR-013: Structured config with apps[] and scripts[] arrays
- ADR-014: Configurable keyboard shortcuts (per-item, not positional)
- ADR-015: Action detail panel (command preview, type, shortcuts, config reference)
- ADR-016: Config cache for instant list rendering
- ADR-017: Deferred selection timing (selectedItemId requires 50ms delay)
- ADR-018: Action view Info section + global keyboard shortcuts
- ADR-019: Smart form dropdowns (tag selector, custom icon support)

## Key concepts
- LocalStorage only holds `id`, `path`, `createdAt` (minimal registration data)
- All project details live in `.project-launcher.json` in the project root
- Config structure: `name`, `meta` (icon/color/tag/url/repoUrl/notes/editor/archived/starred), `env`, `apps[]`, `scripts[]`
- `meta.notes` accepts a single string or an array of strings; in the form textarea each array item is one line; in the action detail panel each line renders as a separate row; in the list view only the first line is shown
- `apps[]` — launchers: `app` field = CLI binary spawned silently in a login shell (full env), `command` field = interactive terminal session, `url` field = opened via Raycast `open()` (supports URL schemes like `obsidian://`)
- `scripts[]` — background shell commands (execSync, no terminal)
- App shorthands: `"editor"`, `"terminal"`, `"git"`, `"browser"`, `"repoBrowser"`, `"claude"` expand via preferences
- `meta.editor` overrides the global default editor for a specific project
- Variable substitution: `${dir}` (project path), `${url}` (meta.url), `~` (home dir) in commands, `args`, and `url` fields
- `apps[]` entries support `args` field to pass a specific file/path to the `app` binary instead of the project directory
- Git repo auto-detection (shows git shorthand only for repos)
- Env vars from config are injected into all app launches, commands, and terminal sessions
- Project action view has Info section (project name, path, tag, git status, url, repoUrl, env vars)
- Keyboard shortcuts work in both project list and project action views
- Form fields use smart dropdowns: tag selector with existing tags + "New Tag", icon selector with curated list + "Custom Icon"
- Adding a project with an existing `.project-launcher.json` auto-shows "Import existing configuration" checkbox — when checked, config file is preserved as-is
- `meta.starred` and `meta.archived` are mutually exclusive — starring clears archived, archiving clears starred
- Three-tier filtering: Starred (shortlist), All Projects (default, non-archived), Archived (completed/discarded)
- Open in Finder (`Cmd+F`), Star/Unstar (`Ctrl+S`), Archive/Unarchive (`Ctrl+A`/`Ctrl+U`) actions in both project list and action view
- The last-used filter (tag, starred, archived) is persisted in LocalStorage and restored on next open; invalid/stale values fall back to "All Projects"

## Commands
- `npm run dev` — develop with hot reload
- `npm run build` — build extension
- `npm run lint` — lint
