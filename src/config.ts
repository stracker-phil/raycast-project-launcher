import { getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { basename, join } from "path";
import {
  AppItem,
  AppShorthand,
  ExtensionPreferences,
  Project,
  ProjectFileConfig,
  ResolvedApp,
  ResolvedConfig,
  ResolvedScript,
  ScriptItem,
} from "./types";

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
 * Collect all unique tags from project config files.
 */
export function readAllTags(projects: Project[]): string[] {
  const tags = new Set<string>();
  for (const p of projects) {
    const config = readConfig(p.path);
    if (config?.meta?.tag) tags.add(config.meta.tag);
  }
  return [...tags].sort();
}

/**
 * Write the config file, merging with existing content.
 */
export function writeConfig(projectPath: string, updates: Partial<ProjectFileConfig>): void {
  const existing = readConfig(projectPath);
  const defaults: ProjectFileConfig = existing ?? {
    name: basename(projectPath),
    meta: { icon: "Folder", color: "Blue" },
    env: {},
    apps: ["editor", "terminal"],
    scripts: [],
  };
  const merged = { ...defaults, ...updates };
  const path = join(projectPath, CONFIG_FILENAME);
  writeFileSync(path, JSON.stringify(merged, null, 2) + "\n", "utf-8");
}

// ---------------------------------------------------------------------------
// Variable substitution
// ---------------------------------------------------------------------------

/**
 * Replace ${dir} and ${url} in a string with project values.
 */
function substituteVars(str: string, projectPath: string, url?: string): string {
  let result = str.replace(/\$\{dir\}/g, projectPath);
  if (url) {
    result = result.replace(/\$\{url\}/g, url);
  }
  result = result.replace(/(?<=^|\s|'|")~(?=\/|$)/g, homedir());
  return result;
}

// ---------------------------------------------------------------------------
// App shorthand expansion
// ---------------------------------------------------------------------------

const APP_SHORTHANDS: Set<string> = new Set(["editor", "terminal", "git", "browser", "repoBrowser", "claude"]);

function isAppShorthand(item: AppItem): item is AppShorthand {
  return typeof item === "string" && APP_SHORTHANDS.has(item);
}

function expandAppShorthand(
  shorthand: AppShorthand,
  p: ExtensionPreferences,
  isGitRepo: boolean,
  url?: string,
  repoUrl?: string,
  metaEditor?: string,
): ResolvedApp | null {
  switch (shorthand) {
    case "editor":
      return {
        label: `Edit Code`,
        app: metaEditor || p.defaultEditor || "PhpStorm",
        icon: "Code",
        shortcut: "cmd+o",
      };
    case "terminal":
      return {
        label: "Open Terminal",
        command: "pwd",
        icon: "Terminal",
        shortcut: "cmd+t",
      };
    case "git":
      if (!isGitRepo) return null;
      return {
        label: `Open Git Client`,
        app: p.gitClient || undefined,
        icon: "CheckList",
        shortcut: "cmd+g",
      };
    case "browser":
      if (!url) return null;
      return {
        label: "Open in Browser",
        url,
        icon: "Globe",
        shortcut: "cmd+b",
      };
    case "repoBrowser":
      if (!repoUrl) return null;
      return {
        label: "Open Repository",
        url: repoUrl,
        icon: "Link",
        shortcut: "cmd+shift+r",
      };
    case "claude":
      return {
        label: "Claude Code",
        command: "claude",
        icon: "Stars",
        shortcut: "cmd+c",
      };
  }
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

function resolveApps(
  items: AppItem[] | undefined,
  p: ExtensionPreferences,
  isGitRepo: boolean,
  projectPath: string,
  url?: string,
  repoUrl?: string,
  metaEditor?: string,
): ResolvedApp[] {
  if (!items || !Array.isArray(items) || items.length === 0) return [];

  const resolved: ResolvedApp[] = [];
  for (const item of items) {
    // Skip unknown string entries (e.g. removed shorthands)
    if (typeof item === "string" && !isAppShorthand(item)) continue;
    if (isAppShorthand(item)) {
      const expanded = expandAppShorthand(item, p, isGitRepo, url, repoUrl, metaEditor);
      if (expanded) resolved.push(expanded);
    } else {
      // Full app entry object
      const app: ResolvedApp = {
        label: item.label,
        icon: item.icon || "Window",
        color: item.color,
        shortcut: item.shortcut,
      };
      if (item.app) {
        app.app = item.app;
      }
      if (item.args) {
        app.args = substituteVars(item.args, projectPath, url);
      }
      if (item.command) {
        app.command = substituteVars(item.command, projectPath, url);
      }
      resolved.push(app);
    }
  }
  return resolved;
}

function resolveScripts(
  items: ScriptItem[] | undefined,
  projectPath: string,
  url?: string,
): ResolvedScript[] {
  if (!items || !Array.isArray(items) || items.length === 0) return [];

  return items.map((item) => ({
    label: item.label,
    command: substituteVars(item.command, projectPath, url),
    icon: item.icon || "Terminal",
    color: item.color,
    shortcut: item.shortcut,
  }));
}

function resolveGitInfo(projectPath: string): { branch: string; dirty: boolean } | undefined {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    const status = execSync("git status --porcelain", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    return { branch, dirty: status.length > 0 };
  } catch {
    return undefined;
  }
}

/**
 * Resolve the full config for a project by merging config file with global prefs.
 */
export function resolveConfig(project: Project): ResolvedConfig {
  const p = prefs();
  const fileConfig = readConfig(project.path);
  const isGitRepo = existsSync(join(project.path, ".git"));

  const env =
    fileConfig?.env && Object.keys(fileConfig.env).length > 0 ? fileConfig.env : undefined;

  const url = fileConfig?.meta?.url || undefined;
  const repoUrl = fileConfig?.meta?.repoUrl || undefined;

  return {
    name: fileConfig?.name || basename(project.path),
    meta: {
      icon: fileConfig?.meta?.icon || "Folder",
      color: fileConfig?.meta?.color || "Blue",
      tag: fileConfig?.meta?.tag || undefined,
      url,
      repoUrl,
      notes: fileConfig?.meta?.notes || undefined,
    },
    env,
    apps: resolveApps(fileConfig?.apps, p, isGitRepo, project.path, url, repoUrl, fileConfig?.meta?.editor),
    scripts: resolveScripts(fileConfig?.scripts, project.path, url),
    isGitRepo,
    git: isGitRepo ? resolveGitInfo(project.path) : undefined,
    hasConfigFile: fileConfig !== null,
  };
}
