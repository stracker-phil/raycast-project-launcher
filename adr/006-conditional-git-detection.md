# ADR-006: Automatic Git Detection

**Status:** Accepted
**Date:** 2026-03-08

## Context

Not all projects are git repos. Showing "Open Git Client" for non-repos is misleading.

## Decision

Detect git repos by checking `existsSync(join(project.path, '.git'))` at config resolution time. The git client action is only shown when `isGitRepo` is true.

## Rationale

- No manual configuration needed -- just works
- `.git` check is fast and reliable
- Avoids confusing errors from launching git client on non-repos
- Same pattern can extend to other detection (e.g. `package.json` for Node projects)
