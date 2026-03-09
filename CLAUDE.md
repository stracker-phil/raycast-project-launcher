# Dev Project Launcher

Raycast extension for managing and launching dev projects.

## Stack
- TypeScript + React (Raycast API)
- `@raycast/api` for UI components and storage

## Structure
- `src/list-projects.tsx` — Main list view, groups projects by tag, tag filter dropdown
- `src/project-actions.tsx` — Per-project action list (opened via Enter)
- `src/add-project.tsx` — Add project form (path + tag + meta only)
- `src/actions.ts` — App launchers, script runners, terminal helpers
- `src/config.ts` — Reads `.project-launcher.json`, expands shorthands, resolves config
- `src/storage.ts` — LocalStorage CRUD (stores only path + tag)
- `src/types.ts` — Project, ProjectFileConfig, ResolvedConfig, preferences

## ADRs
Architecture Decision Records live in `adr/`. Read relevant ADRs before changing core behavior. Key decisions:
- ADR-001: Split storage (LocalStorage for registration, JSON file for config)
- ADR-002: Cascading config resolution (file > preferences > fallback)
- ADR-007: Two-tier action UI (Enter → action list, context menu → shortcuts)
- ADR-008: Deep links + quicklinks for direct project access
- ADR-012: Tag filter dropdown on project list
- ADR-013: Structured config with apps[] and scripts[] arrays
- ADR-014: Configurable keyboard shortcuts (per-item, not positional)
- ADR-015: Action detail panel (command preview, type, shortcuts, config reference)

## Key concepts
- LocalStorage only holds `id`, `path`, `tag`, `createdAt`
- All project details live in `.project-launcher.json` in the project root
- Config structure: `name`, `meta` (icon/color/url/notes), `env`, `apps[]`, `scripts[]`
- `apps[]` — interactive launchers (open macOS app via `app` field, or terminal session via `command` field)
- `scripts[]` — background shell commands (execSync, no terminal)
- App shorthands: `"editor"`, `"terminal"`, `"git"`, `"browser"`, `"finder"` expand via preferences
- Variable substitution: `${dir}` (project path), `${url}` (meta.url) in commands
- Git repo auto-detection (shows git shorthand only for repos)
- Env vars from config are injected into all commands and terminal sessions

## Commands
- `npm run dev` — develop with hot reload
- `npm run build` — build extension
- `npm run lint` — lint
