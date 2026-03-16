# ADR-003: CLI Binary Names Instead of macOS App Names

**Status:** Supersedes original "App Names Not Enums" decision
**Date:** 2026-03-16

## Context

Originally, the `app` field stored macOS app names (e.g. `"PhpStorm"`, `"Sublime Merge"`) and launched them via `open -a "<name>" "<path>"`. This worked for launching apps but had a critical limitation: `open -a` uses LaunchServices to spawn apps as children of `launchd`, so the launched app did not inherit the calling process's environment — meaning project-specific `env` vars and custom PATH entries (homebrew, nvm, etc.) were unavailable to the IDE.

## Decision

The `app` field now stores a CLI binary name (e.g. `"phpstorm"`, `"smerge"`, `"edit"`). Apps are launched via `spawn("/bin/zsh", ["-l", "-c", "<binary> <path>"])` with `projectEnv()` merged in. The preference fields (`defaultEditor`, `gitClient`) store CLI binary names instead of macOS app names.

## Rationale

- Full env inheritance: both homebrew PATH and project-specific `env` vars reach the launched app
- Login shell (`-l`) sources `~/.zprofile` / `~/.zshrc` so user PATH is complete
- CLI binaries for major dev tools (JetBrains Toolbox, Sublime Text, VS Code) are standard and well-supported
- `open` (Raycast API) is still used for URLs — unaffected

## Trade-offs

- Requires CLI launchers to be installed and on PATH (e.g. JetBrains Toolbox scripts, `subl`, `code`)
- Preference values need migrating from app names to binary names (one-time user action)
- Existing project configs with `"app": "PhpStorm"` need updating to `"app": "phpstorm"`
