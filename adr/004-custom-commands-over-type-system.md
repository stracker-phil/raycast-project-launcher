# ADR-004: Custom Shell Commands Over Type System

**Status:** Accepted
**Date:** 2026-03-08

## Context

Originally, projects had a `type` field (`ddev | docker-compose | none`) that determined which start/stop commands to run. This required the extension to know about each orchestration tool and its CLI flags.

## Decision

Replace the type enum with free-form `start` and `stop` shell commands in the config file. Users write the exact command they want executed.

## Rationale

- Supports any tool without code changes (DDEV, Docker Compose, Lando, custom scripts)
- Users know their own commands better than the extension can guess
- Eliminates need for `ddevPath` and `dockerComposePath` preferences
- Custom scripts (npm, artisan, etc.) work the same way via the `scripts` field

## Trade-offs

- No built-in validation or auto-detection of service type
- User must write shell commands (minor friction for the target audience of developers)
