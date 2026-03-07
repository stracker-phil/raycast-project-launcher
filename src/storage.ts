import { LocalStorage } from "@raycast/api";
import { Project } from "./types";

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

/**
 * Generate a simple unique ID.
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
