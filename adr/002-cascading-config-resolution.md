# ADR-002: Cascading Config Resolution

**Status:** Accepted
**Date:** 2026-03-08

## Context

Projects need editors, service commands, URLs, and env vars. Some are shared defaults, some are project-specific.

## Decision

Resolve config in priority order: `.project-launcher.json` > global Raycast preferences > hardcoded fallbacks. Empty strings in the config file are treated as "not set" and fall through to the next level.

## Rationale

- Set `defaultEditor: "PhpStorm"` globally, override with `"editor": "Cursor"` per project
- New projects work immediately with sensible defaults
- No duplication -- only override what differs

## Implementation

`resolveConfig(project)` in `config.ts` reads the file, merges with prefs, and returns a `ResolvedConfig` with all fields populated.
