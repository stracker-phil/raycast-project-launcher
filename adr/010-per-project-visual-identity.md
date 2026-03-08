# ADR-010: Per-Project Visual Identity

**Status:** Accepted
**Date:** 2026-03-08

## Context

All projects in the list shared the same blue folder icon. With many projects, visual scanning is slow — users rely entirely on text to distinguish items.

## Decision

Add optional `icon` and `color` fields to `.project-launcher.json`. Icons are chosen from a curated subset of Raycast's `Icon` enum (28 options like Code, Globe, Hammer, Rocket). Colors use Raycast's `Color` enum (7 options). Both are selectable via dropdowns in the Add/Edit Project form.

## Defaults

New projects default to `"Folder"` icon with `"Blue"` tint. Defaults are written to the config file so users see all available fields.

## Scope

Custom icons apply wherever the extension controls rendering (project list, project actions). Raycast quicklinks and pinned commands use the extension icon — this is a Raycast platform constraint and not overridable.

## Trade-offs

- Limited to Raycast's built-in icon set (no custom images)
- Curated subset may miss icons some users want (editable via JSON for full `Icon` enum access)
- Color choices are limited to Raycast's tint colors
