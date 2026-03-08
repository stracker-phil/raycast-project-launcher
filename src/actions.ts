import { getPreferenceValues, showToast, Toast, open, trash } from "@raycast/api";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { ExtensionPreferences, Project, ResolvedConfig } from "./types";
import { configPath } from "./config";

function prefs(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

/**
 * Open the project folder in the configured editor app.
 */
export async function openInEditor(project: Project, config: ResolvedConfig): Promise<void> {
  const app = config.editor;
  try {
    execSync(`open -a "${app}" "${project.path}"`, { timeout: 5000 });
    await showToast(Toast.Style.Success, `Opened ${config.name} in ${app}`);
  } catch (error) {
    await showToast(Toast.Style.Failure, `Failed to open ${app}`, String(error));
  }
}

/**
 * Open the project's .project-launcher.json with the system default editor.
 */
export async function openConfigFile(project: Project): Promise<void> {
  const path = configPath(project);
  try {
    execSync(`open "${path}"`, { timeout: 5000 });
    await showToast(Toast.Style.Success, "Opened config file");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to open config", String(error));
  }
}

/**
 * Open the project folder in the configured terminal app, with env vars if set.
 */
export async function openTerminal(project: Project, config: ResolvedConfig): Promise<void> {
  const { terminalApp } = prefs();
  const envExports = buildEnvExports(config.env);
  const cdCommand = `${envExports}cd ${escapeForShell(project.path)}`;

  try {
    switch (terminalApp) {
      case "iterm":
        execSync(
          `osascript -e 'tell application "iTerm2"
            activate
            set newWindow to (create window with default profile)
            tell current session of newWindow
              write text "${escapeForAppleScript(cdCommand)}"
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
            do script "${escapeForAppleScript(cdCommand)}"
          end tell'`,
          { timeout: 5000 },
        );
        break;
    }
    await showToast(Toast.Style.Success, `Opened terminal in ${config.name}`);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to open terminal", String(error));
  }
}

/**
 * Open the project in the configured git client.
 */
export async function openGitClient(project: Project, config: ResolvedConfig): Promise<void> {
  const { gitClient } = prefs();
  try {
    execSync(`open -a "${gitClient}" "${project.path}"`, { timeout: 5000 });
    await showToast(Toast.Style.Success, `Opened ${config.name} in ${gitClient}`);
  } catch (error) {
    await showToast(Toast.Style.Failure, `Failed to open ${gitClient}`, String(error));
  }
}

/**
 * Start the project's services using the resolved start command.
 */
export async function startServices(project: Project, config: ResolvedConfig): Promise<void> {
  if (!config.start) {
    await showToast(Toast.Style.Failure, "No start command configured");
    return;
  }

  const toast = await showToast(Toast.Style.Animated, `Starting services…`);
  try {
    execSync(config.start, { cwd: project.path, timeout: 60000, env: projectEnv(config) });
    toast.style = Toast.Style.Success;
    toast.title = `${config.name} started`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to start services";
    toast.message = String(error);
  }
}

/**
 * Stop the project's services using the resolved stop command.
 */
export async function stopServices(project: Project, config: ResolvedConfig): Promise<void> {
  if (!config.stop) {
    await showToast(Toast.Style.Failure, "No stop command configured");
    return;
  }

  const toast = await showToast(Toast.Style.Animated, `Stopping services…`);
  try {
    execSync(config.stop, { cwd: project.path, timeout: 60000, env: projectEnv(config) });
    toast.style = Toast.Style.Success;
    toast.title = `${config.name} stopped`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to stop services";
    toast.message = String(error);
  }
}

/**
 * Run a named script from the project config.
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

/**
 * Open a URL in the default browser.
 */
export async function openInBrowser(url: string): Promise<void> {
  await open(url);
}

/**
 * Move the project's .project-launcher.json to the trash.
 */
export async function trashConfigFile(project: Project): Promise<void> {
  const path = configPath(project);
  if (existsSync(path)) {
    await trash(path);
  }
}

/**
 * Reveal the project folder in Finder.
 */
export async function openInFinder(project: Project): Promise<void> {
  try {
    execSync(`open "${project.path}"`, { timeout: 5000 });
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to open Finder", String(error));
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
