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
- `src/storage.ts` — LocalStorage CRUD (stores only path)
- `src/shortcuts.ts` — Keyboard shortcut parsing (`parseShortcut`) and display rendering (`renderShortcut`)
- `src/types.ts` — Project, ProjectFileConfig, ResolvedConfig, preferences

## ADRs
Architecture Decision Records live in `adr/`. Read relevant ADRs before changing core behavior. Key decisions:
- ADR-001: Split storage (LocalStorage for registration, JSON file for config)
- ADR-002: Cascading config resolution (file > preferences > fallback)
- ADR-007: Two-tier action UI (Enter → action list, context menu → shortcuts)
- ADR-008: Deep links + quicklinks for direct project access
- ADR-012: Tag filter dropdown on project list (+ archived projects filter)
- ADR-020: Project archiving (hide/show via meta.archived flag)
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
- Config structure: `name`, `meta` (icon/color/tag/url/repoUrl/notes/editor/archived), `env`, `apps[]`, `scripts[]`
- `apps[]` — interactive launchers (open macOS app via `app` field, or terminal session via `command` field)
- `scripts[]` — background shell commands (execSync, no terminal)
- App shorthands: `"editor"`, `"terminal"`, `"git"`, `"browser"`, `"repoBrowser"`, `"claude"` expand via preferences
- `meta.editor` overrides the global default editor for a specific project
- Variable substitution: `${dir}` (project path), `${url}` (meta.url), `~` (home dir) in commands and `args`
- `apps[]` entries support `args` field to pass a specific file/path to `app` instead of the project directory
- Git repo auto-detection (shows git shorthand only for repos)
- Env vars from config are injected into all commands and terminal sessions
- Project action view has Info section (project name, path, tag, git status, url, repoUrl, env vars)
- Keyboard shortcuts work in both project list and project action views
- Form fields use smart dropdowns: tag selector with existing tags + "New Tag", icon selector with curated list + "Custom Icon"
- Adding a project with an existing `.project-launcher.json` auto-shows "Import existing configuration" checkbox — when checked, config file is preserved as-is
- `meta.archived` hides a project from the main list; "Archived Projects" filter in the dropdown reveals them
- Archive/Unarchive actions available in both the project list (Manage section) and project action view

## Commands
- `npm run dev` — develop with hot reload
- `npm run build` — build extension
- `npm run lint` — lint
