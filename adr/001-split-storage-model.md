# ADR-001: Split Storage Model

**Status:** Accepted (amended 2026-03-10)
**Date:** 2026-03-08

## Context

The extension needs to store project data. Raycast provides LocalStorage (key-value, tied to the extension) and projects live on disk.

## Decision

Store only minimal registration data (`id`, `path`, `createdAt`) in Raycast LocalStorage. All project-specific configuration — including organizational metadata like tags — lives in `.project-launcher.json` at the project root.

### Amendment (2026-03-10)

`tag` was moved from LocalStorage to the config file's `meta.tag` field. LocalStorage now holds only `id`, `path`, and `createdAt`. This makes the config file the single source of truth for all project metadata, improving portability and consistency.

## Rationale

- Config files are version-controllable and shareable across machines
- Projects stay portable — moving a folder preserves its config (including tag)
- Single source of truth: all project metadata in one file, no split concerns
- Decoupled from extension internals — config format can evolve independently
- Developers can edit config with any text editor, no Raycast dependency
- LocalStorage remains lightweight (just an array of path references)

## Trade-offs

- Two data sources to keep in sync (mitigated by config being read-only at resolve time)
- Config file must be created when adding a project
- Removing a project should clean up the config file (we trash it)
- Tag discovery requires reading all config files (mitigated by config cache)
