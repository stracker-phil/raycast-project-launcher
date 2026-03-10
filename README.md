# Dev Project Launcher — Raycast Extension

A personal Raycast extension to manage and launch dev projects. Stop forgetting about hobby projects or fumbling between windows to start your local stack.

## Features

- **Project list** — overview of all registered projects, grouped by tag, with detail panel showing git branch/status
- **Apps** — launch editors, terminals, git clients, browsers, or any custom CLI tool
- **Scripts** — run background commands (build, lint, deploy) directly from Raycast
- **Tags** — group projects by client, hobby, work, etc. with a filter dropdown
- **Search** — Raycast's built-in filtering to find projects instantly
- **Action detail panel** — preview commands, see execution type and shortcuts before running
- **Deep links & quicklinks** — jump directly to a project's action list

## Setup

1. Clone or copy this folder somewhere permanent
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the extension in dev mode:
   ```bash
   npm run dev
   ```
4. Open Raycast — you'll see the "Projects" command
5. Configure extension preferences (Raycast → Extension Settings):
   - **Default Editor** — app name for the `"editor"` shorthand (e.g. `Cursor`, `PhpStorm`)
   - **Config Editor** — app used to open `.project-launcher.json` files
   - **Terminal App** — Terminal.app, iTerm2, or Warp
   - **Git Client** — app name for the `"git"` shorthand (e.g. `Fork`, `Sourcetree`)

## Config File

Each project's configuration lives in a `.project-launcher.json` file in the project root. The extension reads this file to determine what actions are available.

### Full Example

```json
{
  "name": "API Server",
  "meta": {
    "icon": "Rocket",
    "color": "Green",
    "url": "http://localhost:3000",
    "notes": "Main API backend, requires Docker"
  },
  "env": {
    "NODE_ENV": "development",
    "DATABASE_URL": "postgres://localhost:5432/mydb"
  },
  "apps": [
    "editor",
    "terminal",
    "finder",
    "git",
    "browser",
    { "label": "Claude Code", "command": "claude", "icon": "Terminal", "shortcut": "cmd+k" },
    { "label": "Open in Sublime", "app": "Sublime Text", "icon": "Code" }
  ],
  "scripts": [
    { "label": "Start Services", "command": "docker-compose up -d", "icon": "Play", "color": "Green" },
    { "label": "Stop Services", "command": "docker-compose down", "icon": "Stop", "color": "Red" },
    { "label": "Run Tests", "command": "npm test" },
    { "label": "Lint", "command": "npm run lint" }
  ]
}
```

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Display name (defaults to folder name) |
| `meta` | `object` | Visual metadata (see below) |
| `env` | `Record<string, string>` | Environment variables injected into all commands and terminal sessions |
| `apps` | `array` | Interactive launchers — open apps or terminal sessions |
| `scripts` | `array` | Background commands — run via `execSync`, no visible terminal |

### Meta Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `icon` | `string` | `"Folder"` | Raycast icon name (e.g. `Code`, `Rocket`, `Globe`, `Terminal`, `Bug`, `Bolt`) |
| `color` | `string` | `"Blue"` | Icon tint color: `Blue`, `Green`, `Magenta`, `Orange`, `Purple`, `Red`, `Yellow` |
| `url` | `string` | — | Project URL, used by the `"browser"` shorthand and available as `${url}` in commands |
| `notes` | `string` | — | Free-form notes shown in the detail panel |

### Apps Array

Each entry is either a **string shorthand** or a **full object**.

#### String Shorthands

| Shorthand | Action | Default Shortcut |
|-----------|--------|------------------|
| `"editor"` | Opens project in the default editor (from preferences) | `⌘O` |
| `"terminal"` | Opens a new terminal window in the project dir with env vars | `⌘T` |
| `"finder"` | Reveals the project folder in Finder | `⌘F` |
| `"git"` | Opens the git client (from preferences); hidden if not a git repo | `⌘G` |
| `"browser"` | Opens `meta.url` in the default browser; hidden if no URL set | `⌘B` |

#### Full Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | `string` | Yes | Display name in the action list |
| `app` | `string` | — | macOS app name — launched via `open -a` |
| `command` | `string` | — | Shell command — run in an interactive terminal session |
| `icon` | `string` | — | Raycast icon name |
| `color` | `string` | — | Icon tint color |
| `shortcut` | `string` | — | Keyboard shortcut (e.g. `"cmd+k"`, `"cmd+shift+l"`) |

Set either `app` or `command`, not both:
- **`app`**: launches a macOS application with the project path (e.g. `"app": "Cursor"`)
- **`command`**: opens a new terminal window, `cd`s into the project, exports env vars, and runs the command (e.g. `"command": "claude"`)

### Scripts Array

Each entry is an object:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | `string` | Yes | Display name in the action list |
| `command` | `string` | Yes | Shell command to run in the background |
| `icon` | `string` | — | Raycast icon name (defaults to `Terminal`) |
| `color` | `string` | — | Icon tint color (defaults to `Orange`) |
| `shortcut` | `string` | — | Keyboard shortcut |

Scripts run via `execSync` in the project directory with env vars injected. They show a toast with progress and result. Timeout is 120 seconds.

### Variable Substitution

All `command` fields (in both apps and scripts) support these variables:

| Variable | Expands to |
|----------|-----------|
| `${dir}` | Project path (e.g. `/Users/philipp/Projects/my-api`) |
| `${url}` | Value of `meta.url` |

### Environment Variables

The `env` object is injected into:
- All script executions
- All app `command` terminal sessions
- Terminal sessions opened via the `"terminal"` shorthand

It is **not** injected into `open -a` app launches (editor, git client, Finder).

## Usage

### Adding a Project

1. Open Raycast → "Projects" → press `⌘N`
2. Pick the project folder, set a name and tag
3. Edit the `.project-launcher.json` to configure apps and scripts

### Launching a Project

1. Open Raycast → "Projects"
2. Select a project → press Enter to see all actions
3. Or use keyboard shortcuts directly from the project list:

| Action | Shortcut |
|--------|----------|
| Show all actions | `Enter` |
| Editor (default) | `⌘O` |
| Terminal | `⌘T` |
| Finder | `⌘F` |
| Git client | `⌘G` |
| Browser | `⌘B` |
| Edit project | `⌘E` |
| Edit config file | `⌘⇧E` |
| Create quicklink | `⌘P` |
| Remove project | `⌃X` |

## How It Works

- **Registration** is stored in Raycast's LocalStorage (id, path, tag, createdAt only)
- **Configuration** lives in `.project-launcher.json` in each project root — version-controllable and portable
- **Config resolution** merges the config file with extension preferences and hardcoded fallbacks
- **Git detection** is automatic (checks for `.git` directory)

## Extension Icon

Drop a 512x512 PNG named `extension-icon.png` into the `assets/` folder. The [Raycast Icon Generator](https://icon.ray.so) is a quick way to make one.
