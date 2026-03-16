# ADR-020: Project Archiving

**Status:** Accepted
**Date:** 2026-03-16

## Context

Users accumulate projects over time, and some become inactive without being worth removing entirely. Deleting a project loses its config and registration. A softer mechanism is needed to declutter the main list while keeping projects accessible.

## Decision

Add an `archived` boolean flag to `meta` in `.project-launcher.json`. Archived projects are hidden from the default project list and only visible when the user selects "Archived Projects" in the filter dropdown.

## Implementation

- `meta.archived: true` in the config file marks a project as archived
- The main list filters out archived projects by default (the "All Tags" view only shows active projects)
- The filter dropdown (ADR-012) gains an "Archived Projects" entry when archived projects exist
- Archive (`Ctrl+A`) and Unarchive (`Ctrl+U`) actions are available in the Manage section of both the project list and the project action view
- Unarchiving removes the `archived` key from the config file entirely (rather than setting it to `false`)
- The `setArchived()` helper in `config.ts` handles reading, toggling, and writing the config file

## Rationale

- Storing the flag in the config file (not LocalStorage) keeps it consistent with ADR-001's split storage model — project metadata belongs in `.project-launcher.json`
- Soft-hiding is preferable to deletion: the project stays registered and its config is preserved
- Reuses the existing filter dropdown rather than introducing a separate UI, keeping the interface simple
