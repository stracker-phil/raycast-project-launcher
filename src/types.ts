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

/**
 * Per-project config read from .project-launcher.json in the project root.
 */
export interface ProjectFileConfig {
  /** Display name (defaults to folder name) */
  name?: string;
  /** App name to open with (e.g. "PhpStorm", "Cursor", "Sublime Text") */
  editor?: string;
  /** Shell command to start services */
  start?: string;
  /** Shell command to stop services */
  stop?: string;
  /** Project URL for browser */
  url?: string;
  /** Env vars merged into all commands and terminal sessions */
  env?: Record<string, string>;
  /** Named shell commands shown as actions (e.g. { "Build": "npm run build" }) */
  scripts?: Record<string, string>;
  /** Raycast icon name for the project list (e.g. "Code", "Globe", "Hammer") */
  icon?: string;
  /** Raycast tint color for the project icon (e.g. "Blue", "Green", "Orange") */
  color?: string;
  /** Free-form notes displayed in the project detail panel */
  notes?: string;
}

/**
 * Resolved config for a project — merged from config file and global prefs.
 */
export interface ResolvedConfig {
  name: string;
  editor: string;
  start?: string;
  stop?: string;
  url?: string;
  env?: Record<string, string>;
  scripts?: Record<string, string>;
  icon: string;
  color: string;
  notes?: string;
  isGitRepo: boolean;
  hasConfigFile: boolean;
}

/**
 * Icon choices for the project list (subset of Raycast Icon enum).
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
  "Cog",
  "Document",
  "GameController",
  "Leaf",
  "LightBulb",
  "Link",
  "Lock",
  "Monitor",
  "Music",
  "Pencil",
  "Person",
  "Phone",
  "Rocket",
  "Shield",
  "Snippets",
  "Wand",
  "Wrench",
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
