import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { execSync } from "child_process";
import { ExtensionPreferences, Project } from "./types";

function prefs(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

/**
 * Open the project folder in PhpStorm.
 */
export async function openInPhpStorm(project: Project): Promise<void> {
  const { phpstormPath } = prefs();

  try {
    // Try the configured CLI path first.
    // If that fails, fall back to the `open -a` approach.
    try {
      execSync(`"${phpstormPath}" "${project.path}"`, { timeout: 5000 });
    } catch {
      // Fallback: use macOS `open -a` with the app bundle
      execSync(`open -a "PhpStorm" "${project.path}"`, { timeout: 5000 });
    }
    await showToast(Toast.Style.Success, `Opened ${project.name} in PhpStorm`);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to open PhpStorm", String(error));
  }
}

/**
 * Open the project folder in the configured terminal app.
 */
export async function openTerminal(project: Project): Promise<void> {
  const { terminalApp } = prefs();

  try {
    switch (terminalApp) {
      case "iterm":
        execSync(
          `osascript -e 'tell application "iTerm2"
            activate
            set newWindow to (create window with default profile)
            tell current session of newWindow
              write text "cd ${escapeForAppleScript(project.path)}"
            end tell
          end tell'`,
          { timeout: 5000 },
        );
        break;

      case "warp":
        // Warp supports opening a folder directly
        execSync(`open -a "Warp" "${project.path}"`, { timeout: 5000 });
        break;

      case "terminal":
      default:
        execSync(
          `osascript -e 'tell application "Terminal"
            activate
            do script "cd ${escapeForAppleScript(project.path)}"
          end tell'`,
          { timeout: 5000 },
        );
        break;
    }
    await showToast(Toast.Style.Success, `Opened terminal in ${project.name}`);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to open terminal", String(error));
  }
}

/**
 * Start the project's container services.
 */
export async function startServices(project: Project): Promise<void> {
  if (project.type === "none") {
    await showToast(Toast.Style.Failure, "No services configured for this project");
    return;
  }

  const toast = await showToast(Toast.Style.Animated, `Starting ${project.type}…`);

  try {
    const cmd = buildServiceCommand(project, "start");
    execSync(cmd, { cwd: project.path, timeout: 60000, env: shellEnv() });
    toast.style = Toast.Style.Success;
    toast.title = `${project.name} started`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to start services";
    toast.message = String(error);
  }
}

/**
 * Stop the project's container services.
 */
export async function stopServices(project: Project): Promise<void> {
  if (project.type === "none") {
    await showToast(Toast.Style.Failure, "No services configured for this project");
    return;
  }

  const toast = await showToast(Toast.Style.Animated, `Stopping ${project.type}…`);

  try {
    const cmd = buildServiceCommand(project, "stop");
    execSync(cmd, { cwd: project.path, timeout: 60000, env: shellEnv() });
    toast.style = Toast.Style.Success;
    toast.title = `${project.name} stopped`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to stop services";
    toast.message = String(error);
  }
}

/**
 * Open the project URL in the default browser.
 */
export async function openInBrowser(project: Project): Promise<void> {
  if (!project.url) {
    await showToast(Toast.Style.Failure, "No URL configured for this project");
    return;
  }
  await open(project.url);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildServiceCommand(project: Project, action: "start" | "stop"): string {
  const { ddevPath, dockerComposePath } = prefs();

  if (project.type === "ddev") {
    return `"${ddevPath}" ${action}`;
  }

  // docker-compose
  if (action === "start") {
    return `"${dockerComposePath}" compose up -d`;
  }
  return `"${dockerComposePath}" compose down`;
}

/**
 * Build an env object that includes common paths so CLI tools are found.
 */
function shellEnv(): NodeJS.ProcessEnv {
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
  };
}

/**
 * Escape a string for use inside an AppleScript string literal.
 */
function escapeForAppleScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
