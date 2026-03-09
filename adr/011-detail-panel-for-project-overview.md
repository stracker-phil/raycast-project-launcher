# ADR-011: Detail Panel for Project Overview

**Status:** Accepted
**Date:** 2026-03-08

## Context

The project list showed only the project name, path (as subtitle), and a few accessory icons. Understanding a project's full configuration required navigating into it or opening the JSON file.

## Decision

Enable `isShowingDetail` on the List component to show a structured metadata panel alongside the project list. The detail panel displays: path, tag, git info, URL (as clickable link), apps, scripts, environment variables, and notes.

## Implementation

Uses `List.Item.Detail.Metadata` (not raw markdown) for consistent formatting with labels, tag lists, links, and separators. Sections are conditionally rendered — only configured fields appear.

### Git section

When the project is a git repository, a dedicated Git section shows:
- **Branch** — current branch name (via `git rev-parse --abbrev-ref HEAD`)
- **Status** — colored tag: green "Clean" or orange "Uncommitted Changes" (via `git status --porcelain`)

Git info is resolved in `resolveConfig` as an optional `git` field on `ResolvedConfig` (branch + dirty flag). Commands have a 3-second timeout to avoid blocking the UI. The section is hidden entirely for non-git projects or if the git commands fail.

## Rationale

- All project details visible at a glance without navigation
- Metadata component provides structured layout (labels, links, tags) over raw markdown
- No functionality lost — actions remain in the action panel and two-tier UI (ADR-007)
- Subtitles are hidden when detail is active (Raycast constraint), but path is shown in the metadata instead

## Trade-offs

- List items are narrower with the detail panel visible (less room for long project names)
- Detail panel is read-only — editing still requires the form or JSON file (consistent with ADR-009)
