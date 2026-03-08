# ADR-005: Per-Project Environment Variables

**Status:** Accepted
**Date:** 2026-03-08

## Context

Some projects need specific environment variables (e.g. `CLAUDE_MODEL`, `NODE_ENV`, custom API keys) set when running commands or opening terminals.

## Decision

The `env` field in `.project-launcher.json` is an object of key-value pairs merged into `process.env` for all commands (start/stop, scripts) and exported as shell variables in terminal sessions.

## Implementation

- Commands: `env` merged via `projectEnv()` into `execSync` options
- Terminal sessions: `export K=V; export K2=V2; cd /path` prepended to the shell command
- PATH is always expanded with `/usr/local/bin` and `/opt/homebrew/bin` for Homebrew tool discovery

## Trade-offs

- Warp terminal doesn't support env injection (opened via `open -a`, no script control)
- Env vars are visible in the config file (don't store secrets there)
