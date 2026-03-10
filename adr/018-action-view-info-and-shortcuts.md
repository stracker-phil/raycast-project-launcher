# ADR-018: Action View Info Section and Global Shortcuts

**Status:** Accepted
**Date:** 2026-03-10

## Context

The project action view (opened via Enter from the project list) had two UX gaps:

1. **Keyboard shortcuts only worked in the project list**, not inside the action view. Users expected `Cmd+C` (Claude Code) etc. to work regardless of which view they were in.
2. **No project context was visible** inside the action view beyond the navigation title. Users had to go back to the list to see path, git status, or other project metadata.

## Decision

### Global shortcuts in action view

All actions with keyboard shortcuts are added to every item's `ActionPanel` (in a "Shortcuts" section), so shortcuts work regardless of which action item is selected. This mirrors the project list behavior where all app shortcuts are available on every item.

### Info section

A dedicated "Info" section is rendered at the top of the action list with a single item showing:
- Project name (as the list item title)
- Path, tag, git branch/status, URL, environment variables, notes (in the detail panel)
- Primary action: "Open in Finder"
- All shortcuts available from this item too

The project name is also shown in the search bar placeholder (`"ProjectName -- Search actions..."`).

## Rationale

- Consistent shortcut behavior across both views reduces friction
- Project context is always visible without navigating back
- The Info item's "Open in Finder" primary action replaces the removed `finder` app shorthand, providing the same functionality without a dedicated config entry

## Trade-offs

- Each item's ActionPanel is larger (includes all shortcut actions), but they are in a collapsed "Shortcuts" section
- The Info item takes vertical space in the action list, but provides value as a quick-reference
