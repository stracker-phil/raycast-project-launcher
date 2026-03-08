# ADR-009: Form UI for Simple Fields, JSON for Advanced Config

**Status:** Accepted
**Date:** 2026-03-08

## Context

The config file has both simple fields (name, editor, url, start, stop) and structured fields (env as key-value pairs, scripts as named commands). Raycast forms don't support dynamic key-value pair editing.

## Decision

The Edit Project form reads from and writes to `.project-launcher.json` for simple string fields. Advanced fields (`env`, `scripts`) are preserved on write but only editable via direct JSON editing (accessible via "Edit Config File" action in the form).

## Implementation

`writeConfig()` merges updates with existing config, so form saves never overwrite `env` or `scripts`. New projects get a full template with empty `env: {}` and `scripts: {}` so the user sees all available fields.

## Rationale

- Most edits (rename, change URL, update commands) work in the form UI
- No information loss -- unmapped fields are preserved
- Power users can always drop to JSON for full control
