/**
 * The type of container orchestration used by a project.
 * - "ddev": Uses DDEV (ddev start / ddev stop)
 * - "docker-compose": Uses Docker Compose (docker compose up / down)
 * - "none": No container services
 */
export type ProjectType = "ddev" | "docker-compose" | "none";

/**
 * A registered dev project.
 */
export interface Project {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Absolute path to the project root */
  path: string;
  /** Container orchestration type */
  type: ProjectType;
  /** URL to open in browser (e.g. https://myproject.ddev.site) */
  url?: string;
  /** Optional tag for grouping (e.g. "client", "hobby", "work") */
  tag?: string;
  /** ISO timestamp of when the project was added */
  createdAt: string;
}

/**
 * Extension-level preferences from package.json.
 */
export interface ExtensionPreferences {
  phpstormPath: string;
  terminalApp: "terminal" | "iterm" | "warp";
  ddevPath: string;
  dockerComposePath: string;
}
