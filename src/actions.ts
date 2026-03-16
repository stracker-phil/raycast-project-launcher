import { getPreferenceValues, showToast, Toast, open, trash, closeMainWindow } from "@raycast/api";
import { execSync, spawn } from "child_process";
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
 * - `app` field: CLI binary spawned silently in a login shell with project env vars
 * - `command` field: open in interactive terminal session
 */
export async function launchApp(
  project: Project,
  config: ResolvedConfig,
  app: ResolvedApp,
): Promise<void> {
  try {
    await closeMainWindow();

    if (app.app) {
      const target = app.args || project.path;
      // Spawn via login shell so the app inherits full PATH + project env vars
      const child = spawn("/bin/zsh", ["-l", "-c", `${app.app} ${shellArg(target)}`], {
        cwd: project.path,
        env: projectEnv(config),
        detached: true,
        stdio: "ignore",
      });
      child.unref();
    } else if (app.command) {
      await openTerminalWithCommand(project, config, app.command);
    } else if (app.url) {
      await open(app.url);
    }

    await showToast(Toast.Style.Success, `Launched ${app.label}`);
  } catch (error) {
    await showToast(Toast.Style.Failure, `Failed: ${app.label}`, String(error));
  }
}

/**
 * Open the project's .project-launcher.json in the configured config editor.
 */
export async function openConfigFile(project: Project, config: ResolvedConfig): Promise<void> {
  const { configEditor } = prefs();
  const app = configEditor || "edit";
  const path = configPath(project);

  try {
    await closeMainWindow();
    const child = spawn("/bin/zsh", ["-l", "-c", `${app} ${shellArg(path)}`], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

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
  const envExports = buildEnvExports(config.env);
  const cdPart = `cdir ${shellArg(project.path)}`;
  const fullCommand = command ? `${envExports}${cdPart}; ${command}` : `${envExports}${cdPart}`;

  execSync(
    `osascript -e '
      set wasRunning to application "Terminal" is running
      tell application "Terminal"
        if wasRunning then
          do script "${escapeForAppleScript(fullCommand)}"
        else
          activate
          delay 0.1
          do script "${escapeForAppleScript(fullCommand)}" in front window
        end if
        activate
      end tell'`,
    { timeout: 5000 },
  );
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
      "/Users/philipp/File-Catalog/bin",
      process.env.PATH,
    ].join(":"),
    ...config.env,
  };
}

function buildEnvExports(env?: Record<string, string>): string {
  if (!env || Object.keys(env).length === 0) return "";
  return (
    Object.entries(env)
      .map(([k, v]) => `export ${k}=${shellArg(v)}`)
      .join("; ") + "; "
  );
}

function shellArg(str: string): string {
  return `'${str.replace(/'/g, "'\\''")}'`;
}

function escapeForAppleScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
