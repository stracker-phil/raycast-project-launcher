# Dev Project Launcher — Raycast Extension

A personal Raycast extension to manage and launch your dev projects. Stop forgetting about hobby projects or fumbling between windows to start your local stack.

## Features

- **Project list** — overview of all your registered projects, grouped by tag
- **Open in PhpStorm** — launches the project in your IDE
- **Open terminal** — opens a new terminal window `cd`'d into the project folder (Terminal.app, iTerm2, or Warp)
- **Start / Stop services** — run `ddev start`/`ddev stop` or `docker compose up -d`/`docker compose down` directly from Raycast
- **Open in browser** — launch the project URL (e.g. `https://myproject.ddev.site`)
- **Tags** — group projects by client, hobby, work, etc.
- **Search** — Raycast's built-in filtering to find projects instantly

## Setup

1. Clone or copy this folder somewhere permanent (e.g. `~/Developer/raycast-extensions/dev-project-launcher/`)

2. Install dependencies:
   ```bash
   cd dev-project-launcher
   npm install
   ```

3. Start the extension in dev mode:
   ```bash
   npm run dev
   ```

4. Open Raycast → you'll see "List Projects" and "Add Project" commands

5. Configure extension preferences (Raycast → Extension Settings):
   - **PhpStorm CLI Path**: defaults to `/usr/local/bin/phpstorm`. If you use JetBrains Toolbox, update to the Toolbox script path (e.g. `~/Library/Application Support/JetBrains/Toolbox/scripts/phpstorm`)
   - **Terminal App**: choose between Terminal.app, iTerm2, or Warp
   - **DDEV Path**: defaults to `/usr/local/bin/ddev`
   - **Docker Compose Path**: defaults to `/usr/local/bin/docker` (uses `docker compose` v2 syntax)

## Usage

### Adding a project

1. Open Raycast → "Add Project"
2. Fill in the name, pick the project folder, choose the service type
3. Optionally add a URL and a tag

### Launching a project

1. Open Raycast → "List Projects"
2. Select a project, then use the action panel:

| Action              | Shortcut      |
|---------------------|---------------|
| Open in PhpStorm    | `Enter`       |
| Open Terminal       | `⌘ T`         |
| Open in Browser     | `⌘ B`         |
| Start services      | `⌘ ⇧ S`       |
| Stop services       | `⌘ ⇧ X`       |
| Edit project        | `⌘ E`         |
| Copy path           | `⌘ ⇧ C`       |
| Copy URL            | `⌘ ⇧ U`       |
| Remove project      | `⌃ X`         |

## How it works

Projects are stored in Raycast's LocalStorage as a JSON array. No external config files, no database. The extension shells out to your local CLI tools (phpstorm, ddev, docker) via `child_process.execSync`.

## Extension icon

Drop a 512×512 PNG named `extension-icon.png` into the `assets/` folder. The [Raycast Icon Generator](https://icon.ray.so) is a quick way to make one.
