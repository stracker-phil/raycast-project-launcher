import { getPreferenceValues } from "@raycast/api";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { ExtensionPreferences, Project, ProjectFileConfig, ResolvedConfig } from "./types";

export const CONFIG_FILENAME = ".project-launcher.json";

function prefs(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

/**
 * Absolute path to the config file for a project.
 */
export function configPath(project: Project): string {
  return join(project.path, CONFIG_FILENAME);
}

/**
 * Read the .project-launcher.json from a project root. Returns null if missing or invalid.
 */
export function readConfig(projectPath: string): ProjectFileConfig | null {
  const path = join(projectPath, CONFIG_FILENAME);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ProjectFileConfig;
  } catch {
    return null;
  }
}

/**
 * Write the config file, preserving fields not managed by the form (env, scripts).
 */
export function writeConfig(projectPath: string, updates: Partial<ProjectFileConfig>): void {
  const existing = readConfig(projectPath);
  const defaults: ProjectFileConfig = existing ?? {
    name: basename(projectPath),
    editor: "",
    start: "",
    stop: "",
    url: "",
    env: {},
    scripts: {},
    icon: "Folder",
    color: "Blue",
  };
  const merged = { ...defaults, ...updates };
  const path = join(projectPath, CONFIG_FILENAME);
  writeFileSync(path, JSON.stringify(merged, null, 2) + "\n", "utf-8");
}

/**
 * Resolve the full config for a project by merging config file with global prefs.
 */
export function resolveConfig(project: Project): ResolvedConfig {
  const { defaultEditor } = prefs();
  const fileConfig = readConfig(project.path);

  const env = fileConfig?.env && Object.keys(fileConfig.env).length > 0 ? fileConfig.env : undefined;
  const scripts =
    fileConfig?.scripts && Object.keys(fileConfig.scripts).length > 0 ? fileConfig.scripts : undefined;

  return {
    name: fileConfig?.name || basename(project.path),
    editor: fileConfig?.editor || defaultEditor || "PhpStorm",
    start: fileConfig?.start || undefined,
    stop: fileConfig?.stop || undefined,
    url: fileConfig?.url || undefined,
    env,
    scripts,
    icon: fileConfig?.icon || "Folder",
    color: fileConfig?.color || "Blue",
    notes: fileConfig?.notes || undefined,
    isGitRepo: existsSync(join(project.path, ".git")),
    hasConfigFile: fileConfig !== null,
  };
}
