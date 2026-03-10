/**
 * A registered dev project (stored in LocalStorage).
 * Only the path and organizational metadata live here — everything else
 * comes from .project-launcher.json in the project root.
 */
export interface Project {
  id: string;
  path: string;
  tag?: string;
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
  url?: string;
  notes?: string;
}

/**
 * An app launcher entry — opens an interactive app or terminal session.
 * - `app` field: launched via `open -a "AppName" "projectPath"`
 * - `command` field: opened in a new interactive terminal session
 * - string shorthand (e.g. "editor"): expands to a predefined app config
 */
export interface AppEntry {
  label: string;
  /** macOS app name — launched via `open -a` */
  app?: string;
  /** Shell command — run in an interactive terminal session */
  command?: string;
  icon?: string;
  color?: string;
  /** Keyboard shortcut, e.g. "cmd+k" or "cmd+shift+k" */
  shortcut?: string;
}

/** Predefined app shorthands that expand using preferences / auto-detection. */
export type AppShorthand = "editor" | "terminal" | "git" | "browser" | "finder" | "claude";
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
  /** Keyboard shortcut, e.g. "cmd+k" or "cmd+shift+k" */
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
  /** For `open -a` style launches */
  app?: string;
  /** For interactive terminal launches */
  command?: string;
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
    url?: string;
    notes?: string;
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
  "Heart",
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
  "AppWindow",
  "BulletPoints",
  "Text",
  "Play",
  "Stop",
  "Trash",
  "Power",
  "Tag",
  "Stars",
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
  terminalApp: "terminal" | "iterm" | "warp";
  gitClient: string;
}
