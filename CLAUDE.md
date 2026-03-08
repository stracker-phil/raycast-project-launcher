# Dev Project Launcher

Raycast extension for managing and launching dev projects.

## Stack
- TypeScript + React (Raycast API)
- `@raycast/api` for UI components and storage

## Structure
- `src/list-projects.tsx` — Main list view, groups projects by tag, tag filter dropdown
- `src/project-actions.tsx` — Per-project action list (opened via Enter)
- `src/add-project.tsx` — Add project form (path + tag only)
- `src/actions.ts` — All launch/service/script actions
- `src/config.ts` — Reads `.project-launcher.json`, detects git, resolves config
- `src/storage.ts` — LocalStorage CRUD (stores only path + tag)
- `src/types.ts` — Project, ProjectFileConfig, ResolvedConfig, preferences

## ADRs
Architecture Decision Records live in `adr/`. Read relevant ADRs before changing core behavior. Key decisions:
- ADR-001: Split storage (LocalStorage for registration, JSON file for config)
- ADR-002: Cascading config resolution (file > preferences > fallback)
- ADR-007: Two-tier action UI (Enter → action list, context menu → shortcuts)
- ADR-008: Deep links + quicklinks for direct project access
- ADR-012: Tag filter dropdown on project list

## Key concepts
- LocalStorage only holds `id`, `path`, `tag`, `createdAt`
- All project details live in `.project-launcher.json` in the project root
- Config resolution: config file > global preferences > folder name fallback
- Git repo auto-detection (shows git client action only for repos)
- Editor/git client are app names (any valid macOS app via `open -a`)
- Env vars from config are injected into all commands and terminal sessions
- "Edit Config" opens the JSON file in the editor; "Edit Registration" changes path/tag

## Commands
- `npm run dev` — develop with hot reload
- `npm run build` — build extension
- `npm run lint` — lint
