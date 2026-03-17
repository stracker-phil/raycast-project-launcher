# ADR-023: Project State Providers

**Status:** Accepted (revised)
**Date:** 2026-03-17

## Context

Some actions only make sense when a service is in a particular state — e.g. "Stop DDEV" when DDEV is running, or "Open in Browser" when the web service is up. Previously, `state` was a per-script field that tied each script to a provider output and showed state inline in the script title. This made states script-centric rather than project-centric, and apps couldn't participate. Additionally, `hiddenStates` referenced arbitrary raw provider output strings, making configs fragile and hard to read.

## Decision

Make states a **project-level concept** with structured definitions. Each state has a `source` (provider reference), a display `label`, and a set of `values` — each value has a stable key (for `hiddenStates`), a raw `value` to match against provider output, and a display `label`. Both apps and scripts use `hiddenStates` referencing value keys.

### Config format

```json
{
  "stateProviders": {
    "ddev": "ddev status -j",
    "xdebug": "ddev xdebug status"
  },
  "states": {
    "web": {
      "source": "ddev:.raw.services.web.status",
      "label": "Web service",
      "values": {
        "web_on":  { "value": "running", "label": "Running" },
        "web_off": { "value": "stopped", "label": "Stopped" }
      }
    },
    "xdebug": {
      "source": "xdebug",
      "label": "XDebug",
      "values": {
        "xdebug_on":  { "value": "xdebug enabled",  "label": "On" },
        "xdebug_off": { "value": "xdebug disabled", "label": "Off" }
      }
    }
  },
  "apps": [
    { "label": "Open in Browser", "url": "${url}", "hiddenStates": ["web_off"] }
  ],
  "scripts": [
    { "label": "Start DDEV", "command": "ddev start", "hiddenStates": ["web_on"] },
    { "label": "Stop DDEV",  "command": "ddev stop",  "hiddenStates": ["web_off"] },
    { "label": "XDebug: ON",  "command": "ddev xdebug on",  "hiddenStates": ["xdebug_on"] },
    { "label": "XDebug: OFF", "command": "ddev xdebug off", "hiddenStates": ["xdebug_off"] }
  ]
}
```

### Structure

- **`stateProviders`** — unchanged: maps provider names to shell commands
- **`states`** — named state definitions:
  - `source` — provider reference (`"name:.json.path"` for JSON extraction, `"name"` for raw text)
  - `label` — display category name shown in the detail panel (e.g. "Web service")
  - `values` — keyed by stable state key, each with:
    - `value` — raw provider output to match against
    - `label` — display value shown in the detail panel (e.g. "Running")
- **`hiddenStates`** — on both apps and scripts; references value keys (e.g. `"web_on"`, `"xdebug_off"`)

### Detail panel display

Active states are shown as label rows in the metadata panel for all non-Manage items:
- `Web service: Running`
- `XDebug: On`

### Provider reference syntax

| `source` value | Resolution |
|---|---|
| `"providerName:.json.path"` | Provider output parsed as JSON, value extracted via dot path |
| `"providerName"` | Provider output returned as raw trimmed text |

### Visibility rules

- **States loading / not yet resolved:** all items visible (safe default)
- **States resolved:** items whose `hiddenStates` contain any active value key are hidden
- **Provider error:** item stays visible (no keys emitted for failed providers)
- **Unmatched provider output:** raw value shown as fallback display label, no key emitted (items stay visible)

## Implementation

- `stateProviders` maps provider names to shell commands (passed through with variable substitution)
- `states` maps state names to `StateConfig` objects (source gets variable substitution)
- State resolution runs in `project-actions.tsx` via `useEffect` on mount — each provider runs once, output is cached
- After any script executes, all states re-resolve so the UI updates
- Resolution produces two outputs: `activeStateKeys` (for `hiddenStates` filtering) and `activeStateDisplay` (for the detail panel)
- Active states are shown as label/value rows in the detail metadata panel
- Provider commands inherit project env vars and an expanded PATH
- Provider commands have a 5-second timeout

## Rationale

- **Stable value keys** decouple `hiddenStates` from both raw provider output and display labels — renaming a label doesn't break visibility rules
- **Structured values** make configs self-documenting — the mapping from raw output to display text is explicit
- **Category labels** enable clean detail panel display (`"Web service: Running"` instead of `"Web: Running"` as a tag)
- **Project-level states** are more natural — "is DDEV running?" is about the project, not a specific script
- **Apps with `hiddenStates`** — "Open in Browser" when the web server is down adds no value
- **Provider caching** avoids the N×cost problem
- **All-visible fallback** ensures the UI is never broken by slow or failing state checks

## Trade-offs

- State checks are synchronous (`execSync`) — a very slow provider (~5s) will block the UI briefly on mount
- No periodic polling — state only updates on mount and after script execution
