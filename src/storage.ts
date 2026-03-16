import { LocalStorage } from "@raycast/api";
import { Project, ResolvedConfig } from "./types";

const STORAGE_KEY = "projects";

/**
 * Load all projects from LocalStorage.
 */
export async function loadProjects(): Promise<Project[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

/**
 * Save the full project list to LocalStorage.
 */
export async function saveProjects(projects: Project[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

/**
 * Add a single project.
 */
export async function addProject(project: Project): Promise<void> {
  const projects = await loadProjects();
  projects.push(project);
  await saveProjects(projects);
}

/**
 * Remove a project by ID.
 */
export async function removeProject(id: string): Promise<void> {
  const projects = await loadProjects();
  await saveProjects(projects.filter((p) => p.id !== id));
}

/**
 * Update a project in place.
 */
export async function updateProject(updated: Project): Promise<void> {
  const projects = await loadProjects();
  const idx = projects.findIndex((p) => p.id === updated.id);
  if (idx !== -1) {
    projects[idx] = updated;
    await saveProjects(projects);
  }
}

const LAST_OPENED_KEY = "lastOpenedProjectId";

export async function getLastOpenedProjectId(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(LAST_OPENED_KEY)) ?? null;
}

export async function setLastOpenedProjectId(id: string): Promise<void> {
  await LocalStorage.setItem(LAST_OPENED_KEY, id);
}

const LAST_FILTER_KEY = "lastFilter";

export async function getLastFilter(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(LAST_FILTER_KEY)) ?? null;
}

export async function setLastFilter(filter: string): Promise<void> {
  await LocalStorage.setItem(LAST_FILTER_KEY, filter);
}

// ---------------------------------------------------------------------------
// Config cache — instant list render from cached ResolvedConfig
// ---------------------------------------------------------------------------

const CONFIG_CACHE_KEY = "configCache";

export async function loadConfigCache(): Promise<Record<string, ResolvedConfig>> {
  const raw = await LocalStorage.getItem<string>(CONFIG_CACHE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, ResolvedConfig>;
  } catch {
    return {};
  }
}

export async function saveConfigCache(cache: Record<string, ResolvedConfig>): Promise<void> {
  await LocalStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cache));
}

/**
 * Generate a simple unique ID.
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
