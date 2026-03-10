# ADR-016: Config Cache for Instant List Rendering

**Status:** Accepted
**Date:** 2026-03-10

## Context

Opening the project list calls `resolveConfig()` for every project, which uses synchronous `readFileSync` and `execSync` (git status). With 6+ projects this takes ~500ms+, causing a visible loading delay.

## Decision

Cache resolved configs in LocalStorage. On open, render the list from cache (instant), then resolve fresh configs in the background and update the cache for the next open.

## Design

- **Single-phase item rendering**: items are set once from cache. Fresh configs are resolved in a background `setTimeout(500)` and saved to cache, but never replace displayed items.
- **Fallback**: if any project lacks a cached config (e.g., newly added), fall back to `resolveConfig()` for all projects.
- **Cache writes** happen on every open (background) and on `refresh()` (edit/delete actions).

## Constraints

**Items must never be replaced after rendering.** Replacing the items array resets Raycast's internal selection state, breaking `selectedItemId`. This was the core lesson from multiple failed two-phase approaches (render cache first, then replace with fresh data). See ADR-017 for details on the selection timing issue.

## Trade-offs

- Config changes are visible on the second open, not immediately (acceptable: 99% of opens don't follow a config edit, and "Edit Config" triggers `refresh()` which resolves fresh)
- Cache can become stale if config files are edited outside the extension (mitigated by background refresh on every open)
- LocalStorage usage grows with number of projects (negligible: JSON configs are small)
