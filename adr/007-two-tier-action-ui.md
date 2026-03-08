# ADR-007: Two-Tier Action UI

**Status:** Accepted
**Date:** 2026-03-08

## Context

Raycast's `List` component supports a detail panel (`isShowingDetail`) but it only renders markdown/metadata -- not interactive buttons. Putting all actions in the context menu makes them hard to discover.

## Decision

Two tiers of access:
1. **Enter** opens a dedicated action list (`ProjectActions`) showing all available actions as searchable list items, grouped by section (Launch, Services, Scripts, Manage)
2. **Context menu** retains the most-used actions as keyboard-shortcuttable quick actions

## Rationale

- Actions are visually browsable and searchable (important when projects have custom scripts)
- Quick actions remain fast via keyboard shortcuts (Cmd+O, Cmd+T, etc.)
- Raycast doesn't support a two-column interactive layout, so this is the best alternative
