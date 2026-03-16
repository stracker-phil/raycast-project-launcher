# ADR-012: Tag Filter Dropdown

**Status:** Accepted
**Date:** 2026-03-08

## Context

With many projects, the list becomes long even with tag-based grouping. Users may want to focus on a single tag at a time. We also explored whether projects could be registered as individual Raycast commands (eliminating quicklinks), but Raycast does not support dynamic command registration — commands are statically defined in `package.json` at build time.

## Decision

Add a `List.Dropdown` as the `searchBarAccessory` on the project list, allowing users to filter by tag. The default selection ("All Tags") shows every project grouped by tag (existing behavior). Selecting a specific tag shows only projects with that tag. An "Untagged" option is available when untagged projects exist.

## Implementation

- Tag list for the dropdown is derived from all active (non-archived) projects so options remain stable while filtering
- Filtering is applied before grouping, so section headers still render correctly
- The dropdown appears when at least one tag exists or when archived projects exist
- An "Archived Projects" option appears in the dropdown when any project has `meta.archived: true` (see ADR-020)
- The selected filter value is persisted to LocalStorage (`lastFilter` key) and restored on next open. If the saved value is no longer valid (e.g. the tag was removed from all projects), it silently falls back to "All Projects"

## Rationale

- Reduces visual noise for users with many projects across different tags
- Complements the existing search — search filters by name, dropdown filters by tag
- Uses a native Raycast pattern (`searchBarAccessory`) that users already understand
