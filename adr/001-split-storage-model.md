# ADR-001: Split Storage Model

**Status:** Accepted
**Date:** 2026-03-08

## Context

The extension needs to store project data. Raycast provides LocalStorage (key-value, tied to the extension) and projects live on disk.

## Decision

Store only registration metadata (`id`, `path`, `tag`, `createdAt`) in Raycast LocalStorage. All project-specific configuration lives in `.project-launcher.json` at the project root.

## Rationale

- Config files are version-controllable and shareable across machines
- Projects stay portable -- moving a folder preserves its config
- Decoupled from extension internals -- config format can evolve independently
- Developers can edit config with any text editor, no Raycast dependency
- LocalStorage remains lightweight (just an array of path references)

## Trade-offs

- Two data sources to keep in sync (mitigated by config being read-only at resolve time)
- Config file must be created when adding a project
- Removing a project should clean up the config file (we trash it)
