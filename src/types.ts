/**
 * A registered dev project (stored in LocalStorage).
 * Only the path and organizational metadata live here — everything else
 * comes from .project-launcher.json in the project root.
 */
export interface Project {
  id: string;
  path: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Config file types (.project-launcher.json)
// ---------------------------------------------------------------------------

/**
 * Visual metadata for the project or an individual item.
 */
export interface MetaConfig {
  icon?: string;
  color?: string;
  tag?: string;
  url?: string;
  repoUrl?: string;
  notes?: string | string[];
  editor?: string;
  archived?: boolean;
  starred?: boolean;
}

/**
 * An app launcher entry — opens an interactive app or terminal session.
 * - `app` field: CLI binary spawned silently in a login shell with project env vars
 * - `command` field: opened in a new interactive terminal session
 * - string shorthand (e.g. "editor"): expands to a predefined app config
 */
export interface AppEntry {
  label: string;
  app?: string;
  args?: string;
  command?: string;
  url?: string;
  icon?: string;
  color?: string;
  shortcut?: string;
}

/** Predefined app shorthands that expand using preferences / auto-detection. */
export type AppShorthand = "editor" | "terminal" | "git" | "browser" | "repoBrowser" | "claude";
export type AppItem = AppShorthand | AppEntry;

/**
 * A background script entry — runs via execSync, no visible terminal.
 * string shorthand not currently used, but the type supports it for future use.
 */
export interface ScriptEntry {
  label: string;
  command: string;
  icon?: string;
  color?: string;
  shortcut?: string;
}

export type ScriptItem = ScriptEntry;

/**
 * Per-project config read from .project-launcher.json in the project root.
 */
export interface ProjectFileConfig {
  name?: string;
  meta?: MetaConfig;
  env?: Record<string, string>;
  apps?: AppItem[];
  scripts?: ScriptItem[];
}

// ---------------------------------------------------------------------------
// Resolved config (after merging file + prefs + fallbacks)
// ---------------------------------------------------------------------------

export interface ResolvedApp {
  label: string;
  app?: string;
  args?: string;
  command?: string;
  url?: string;
  icon: string;
  color?: string;
  shortcut?: string;
}

export interface ResolvedScript {
  label: string;
  command: string;
  icon: string;
  color?: string;
  shortcut?: string;
}

export interface ResolvedConfig {
  name: string;
  meta: {
    icon: string;
    color: string;
    tag?: string;
    url?: string;
    repoUrl?: string;
    notes?: string | string[];
    archived?: boolean;
    starred?: boolean;
  };
  env?: Record<string, string>;
  apps: ResolvedApp[];
  scripts: ResolvedScript[];
  isGitRepo: boolean;
  git?: {
    branch: string;
    dirty: boolean;
  };
  hasConfigFile: boolean;
}

/**
 * Icon choices for the project list (subset of Raycast Icon enum).
 * https://developers.raycast.com/api-reference/user-interface/icons-and-images
 */
export const PROJECT_ICONS = [
  "Folder",
  "Code",
  "Terminal",
  "Globe",
  "Hammer",
  "Star",
  "Heart",
  "Bolt",
  "Book",
  "Box",
  "Bug",
  "Calendar",
  "Cog",
  "WrenchScrewdriver",
  "Document",
  "Gauge",
  "GameController",
  "House",
  "Leaf",
  "LightBulb",
  "Link",
  "Lock",
  "Monitor",
  "Music",
  "Pencil",
  "Person",
  "Phone",
  "Plug",
  "Shield",
  "Info",
  "Snippets",
  "Wand",
  "Stars",
  "Layers",
  "Window",
  "BulletPoints",
  "Text",
  "Play",
  "Stop",
  "Trash",
  "Power",
  "Tag",
  "Repeat",
] as const;

/**
 * Color choices for the project icon tint.
 */
export const PROJECT_COLORS = [
  "Blue",
  "Green",
  "Magenta",
  "Orange",
  "Purple",
  "Red",
  "Yellow",
] as const;

/**
 * Extension-level preferences from package.json.
 */
export interface ExtensionPreferences {
  defaultEditor: string;
  configEditor: string;
  gitClient: string;
}
