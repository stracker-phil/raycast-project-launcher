# ADR-003: App Names Instead of Enums

**Status:** Accepted
**Date:** 2026-03-08

## Context

Initially, the editor was hardcoded to PhpStorm with a CLI path preference. The git client was hardcoded to Sublime Merge. Adding a new editor required code changes.

## Decision

Use macOS app names as free-form strings (e.g. `"PhpStorm"`, `"Cursor"`, `"VS Code"`). Launch apps via `open -a "<name>" "<path>"` which works with any installed macOS application.

## Rationale

- Zero code changes to support new editors or git clients
- `open -a` is the standard macOS way to launch apps by name
- No need to maintain a mapping table or know CLI paths
- Works with any app that registers itself with macOS

## Trade-offs

- No validation that the app exists until launch time (handled via toast error)
- Less control than direct CLI invocation (e.g. can't pass IDE-specific flags)
- macOS-only (acceptable for a Raycast extension)
