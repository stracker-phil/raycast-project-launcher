# ADR-021: Project Starring and Three-Tier Filtering

**Status:** Accepted
**Date:** 2026-03-16

## Context

The archive flag (ADR-020) lets users hide inactive projects. But the opposite need also exists — surfacing a small set of current/active projects from a growing list. Users want a quick shortlist of what they're working on right now without scrolling through everything.

## Decision

Add a `starred` boolean flag to `meta` in `.project-launcher.json`. Starred and archived are mutually exclusive: starring clears archived, archiving clears starred. This creates a three-tier project lifecycle:

1. **Starred** — current focus projects (shortlist)
2. **All Projects** — every non-archived project (default view)
3. **Archived** — completed or discarded projects

## Implementation

- `meta.starred: true` in the config file marks a project as starred
- The filter dropdown gains a "Starred" entry (shown when any starred projects exist)
- Star (`Ctrl+S`) and Unstar (`Ctrl+S`) toggle actions are available in the Manage section of both the project list and the project action view
- `setStarred()` in `config.ts` handles the flag and clears `archived` when starring
- `setArchived()` clears `starred` when archiving
- Unsetting either flag removes the key from the config file entirely (no `false` values stored)

## Rationale

- Mutual exclusivity keeps the model simple — a project is in exactly one tier. No confusing "starred and archived" state to reason about.
- Starred projects still appear in the default "All Projects" view, so starring is purely additive filtering — it doesn't hide the project from anywhere.
- Reuses the existing filter dropdown (ADR-012) rather than introducing separate UI.
