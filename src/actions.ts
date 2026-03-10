import { getPreferenceValues, showToast, Toast, open, trash } from "@raycast/api";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { ExtensionPreferences, Project, ResolvedApp, ResolvedConfig } from "./types";
import { configPath } from "./config";

function prefs(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

// ---------------------------------------------------------------------------
// App launchers
// ---------------------------------------------------------------------------

/**
 * Launch a resolved app entry.
 * - `app` field: open via `open -a "AppName" "projectPath"`
 * - `command` field: open in interactive terminal session
 * - neither (terminal/finder shorthands): handled by label-based dispatch
 */
export async function launchApp(
  project: Project,
  config: ResolvedConfig,
  app: ResolvedApp,
): Promise<void> {
  try {
    if (app.app) {
      // macOS app launch
      execSync(`open -a "${app.app}" "${project.path}"`, { timeout: 5000 });
      await showToast(Toast.Style.Success, `Opened ${config.name} in ${app.app}`);
      return;
    }

    if (app.command) {
      // Interactive terminal session
      await openTerminalWithCommand(project, config, app.command);
      await showToast(Toast.Style.Success, `Launched ${app.label}`);
      return;
    }

    if (app.icon === "Finder") {
      // Finder shorthand
      execSync(`open "${project.path}"`, { timeout: 5000 });
      return;
    }

    if (app.icon === "Terminal") {
      // Terminal shorthand (just cd + env, no command)
      await openTerminalWithCommand(project, config, undefined);
      await showToast(Toast.Style.Success, `Opened terminal in ${config.name}`);
      return;
    }

    if (app.icon === "Globe") {
      // Browser shorthand
      if (config.meta.url) {
        await open(config.meta.url);
      }
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, `Failed: ${app.label}`, String(error));
  }
}

/**
 * Open the project's .project-launcher.json in the configured config editor.
 */
export async function openConfigFile(project: Project, config: ResolvedConfig): Promise<void> {
  const { configEditor } = prefs();
  // Find the editor app from the resolved apps (first app with an `app` field)
  const editorApp = config.apps.find((a) => a.app)?.app;
  const app = configEditor || editorApp || "Sublime Text";
  const path = configPath(project);

  try {
    switch (app.toLowerCase()) {
      case "subl":
      case "sublime text":
        execSync(`"/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl" "${path}"`, { timeout: 5000 });
        break;

      default:
        execSync(`open -a "${app}" "${path}"`, { timeout: 5000 });
    }

    await showToast(Toast.Style.Success, `Opened config in ${app}`);
  } catch (error) {
    await showToast(Toast.Style.Failure, `Failed to open config in ${app}`, String(error));
  }
}

// ---------------------------------------------------------------------------
// Scripts (background execution)
// ---------------------------------------------------------------------------

/**
 * Run a script in the background via execSync.
 */
export async function runScript(
  project: Project,
  config: ResolvedConfig,
  label: string,
  command: string,
): Promise<void> {
  const toast = await showToast(Toast.Style.Animated, `Running ${label}…`);
  try {
    execSync(command, { cwd: project.path, timeout: 120000, env: projectEnv(config) });
    toast.style = Toast.Style.Success;
    toast.title = `${label} completed`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${label} failed`;
    toast.message = String(error);
  }
}

// ---------------------------------------------------------------------------
// Config file management
// ---------------------------------------------------------------------------

/**
 * Move the project's .project-launcher.json to the trash.
 */
export async function trashConfigFile(project: Project): Promise<void> {
  const path = configPath(project);
  if (existsSync(path)) {
    await trash(path);
  }
}

// ---------------------------------------------------------------------------
// Terminal helpers
// ---------------------------------------------------------------------------

/**
 * Open an interactive terminal session in the project dir.
 * Injects env vars and optionally runs a command.
 */
async function openTerminalWithCommand(
  project: Project,
  config: ResolvedConfig,
  command: string | undefined,
): Promise<void> {
  const { terminalApp } = prefs();
  const envExports = buildEnvExports(config.env);
  const cdPart = `cd ${escapeForShell(project.path)}`;
  const fullCommand = command
    ? `${envExports}${cdPart}; ${command}`
    : `${envExports}${cdPart}`;

  switch (terminalApp) {
    case "iterm":
      execSync(
        `osascript -e 'tell application "iTerm2"
          activate
          set newWindow to (create window with default profile)
          tell current session of newWindow
            write text "${escapeForAppleScript(fullCommand)}"
          end tell
        end tell'`,
        { timeout: 5000 },
      );
      break;

    case "warp":
      execSync(`open -a "Warp" "${project.path}"`, { timeout: 5000 });
      break;

    case "terminal":
    default:
      execSync(
        `osascript -e 'tell application "Terminal"
          activate
          do script "${escapeForAppleScript(fullCommand)}"
        end tell'`,
        { timeout: 5000 },
      );
      break;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function projectEnv(config: ResolvedConfig): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: [
      "/usr/local/bin",
      "/opt/homebrew/bin",
      "/usr/bin",
      "/bin",
      "/usr/sbin",
      "/sbin",
      process.env.PATH,
    ].join(":"),
    ...config.env,
  };
}

function buildEnvExports(env?: Record<string, string>): string {
  if (!env || Object.keys(env).length === 0) return "";
  return (
    Object.entries(env)
      .map(([k, v]) => `export ${k}=${escapeForShell(v)}`)
      .join("; ") + "; "
  );
}

function escapeForShell(str: string): string {
  return `'${str.replace(/'/g, "'\\''")}'`;
}

function escapeForAppleScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
