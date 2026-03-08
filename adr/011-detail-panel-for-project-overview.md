# ADR-011: Detail Panel for Project Overview

**Status:** Accepted
**Date:** 2026-03-08

## Context

The project list showed only the project name, path (as subtitle), and a few accessory icons. Understanding a project's full configuration required navigating into it or opening the JSON file.

## Decision

Enable `isShowingDetail` on the List component to show a structured metadata panel alongside the project list. The detail panel displays: path, editor, tag, git status, URL (as clickable link), start/stop commands, environment variables, scripts, and notes.

## Implementation

Uses `List.Item.Detail.Metadata` (not raw markdown) for consistent formatting with labels, tag lists, links, and separators. Sections are conditionally rendered — only configured fields appear.

## Rationale

- All project details visible at a glance without navigation
- Metadata component provides structured layout (labels, links, tags) over raw markdown
- No functionality lost — actions remain in the action panel and two-tier UI (ADR-007)
- Subtitles are hidden when detail is active (Raycast constraint), but path is shown in the metadata instead

## Trade-offs

- List items are narrower with the detail panel visible (less room for long project names)
- Detail panel is read-only — editing still requires the form or JSON file (consistent with ADR-009)
