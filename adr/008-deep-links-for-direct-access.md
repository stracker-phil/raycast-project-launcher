# ADR-008: Deep Links for Direct Project Access

**Status:** Accepted
**Date:** 2026-03-08

## Context

Accessing a project requires: open Raycast > find "List Projects" > search for project > Enter. For frequently used projects, this is too many steps.

## Decision

Support Raycast deep links via `launchContext`. The `list-projects` command checks for a `projectId` in the launch context and skips directly to that project's actions. Users create Raycast quicklinks (via Cmd+P) named "Project: \<name\>" that appear in root search.

## Alternatives Considered

- **Separate `view-project` command**: Created initially but consolidated into `list-projects` to avoid a near-duplicate command. Deep link handling is just a few lines of code.
- **Dynamic command registration**: Not supported by Raycast's extension model.

## Rationale

- Single command handles both list and direct access
- Quicklinks are a native Raycast concept -- users already know how to find them
- "Project: ..." naming convention makes all projects discoverable by typing "Project"
