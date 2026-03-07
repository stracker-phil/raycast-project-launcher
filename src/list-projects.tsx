import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Project } from "./types";
import { loadProjects, removeProject } from "./storage";
import {
  openInPhpStorm,
  openTerminal,
  startServices,
  stopServices,
  openInBrowser,
} from "./actions";
import AddProjectCommand from "./add-project";

export default function ListProjectsCommand() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function refresh() {
    setIsLoading(true);
    const loaded = await loadProjects();
    // Sort alphabetically, group by tag
    loaded.sort((a, b) => a.name.localeCompare(b.name));
    setProjects(loaded);
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  // Group projects by tag
  const tagged = new Map<string, Project[]>();
  const untagged: Project[] = [];

  for (const p of projects) {
    if (p.tag) {
      const group = tagged.get(p.tag) ?? [];
      group.push(p);
      tagged.set(p.tag, group);
    } else {
      untagged.push(p);
    }
  }

  // Sort tag names
  const sortedTags = [...tagged.keys()].sort();

  async function handleDelete(project: Project) {
    if (
      await confirmAlert({
        title: `Remove "${project.name}"?`,
        message: "This only removes it from the launcher — your files are untouched.",
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await removeProject(project.id);
      await showToast(Toast.Style.Success, `Removed ${project.name}`);
      await refresh();
    }
  }

  function projectItem(project: Project) {
    const typeIcon =
      project.type === "ddev"
        ? { source: Icon.Box, tintColor: Color.Blue }
        : project.type === "docker-compose"
          ? { source: Icon.Box, tintColor: Color.Purple }
          : { source: Icon.Document, tintColor: Color.SecondaryText };

    const accessories: List.Item.Accessory[] = [
      { text: project.type === "none" ? "plain" : project.type },
    ];
    if (project.url) {
      accessories.push({ icon: Icon.Globe });
    }

    return (
      <List.Item
        key={project.id}
        title={project.name}
        subtitle={project.path}
        icon={typeIcon}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Launch">
              <Action
                title="Open in PhpStorm"
                icon={Icon.Code}
                onAction={() => openInPhpStorm(project)}
              />
              <Action
                title="Open Terminal Here"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => openTerminal(project)}
              />
              {project.url && (
                <Action
                  title="Open in Browser"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                  onAction={() => openInBrowser(project)}
                />
              )}
            </ActionPanel.Section>

            {project.type !== "none" && (
              <ActionPanel.Section title="Services">
                <Action
                  title={`Start ${project.type}`}
                  icon={{ source: Icon.Play, tintColor: Color.Green }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  onAction={() => startServices(project)}
                />
                <Action
                  title={`Stop ${project.type}`}
                  icon={{ source: Icon.Stop, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                  onAction={() => stopServices(project)}
                />
              </ActionPanel.Section>
            )}

            <ActionPanel.Section title="Manage">
              <Action
                title="Edit Project"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() =>
                  push(<AddProjectCommand editProject={project} onSaved={refresh} />)
                }
              />
              <Action.CopyToClipboard
                title="Copy Path"
                content={project.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              {project.url && (
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={project.url}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                />
              )}
              <Action
                title="Remove Project"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(project)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects…"
      actions={
        <ActionPanel>
          <Action
            title="Add Project"
            icon={Icon.Plus}
            onAction={() => push(<AddProjectCommand onSaved={refresh} />)}
          />
        </ActionPanel>
      }
    >
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No projects yet"
          description="Press Enter to add your first project"
          icon={Icon.Plus}
        />
      ) : (
        <>
          {sortedTags.map((tag) => (
            <List.Section key={tag} title={tag}>
              {tagged.get(tag)!.map((p) => projectItem(p))}
            </List.Section>
          ))}
          {untagged.length > 0 && (
            <List.Section title={sortedTags.length > 0 ? "Untagged" : "Projects"}>
              {untagged.map((p) => projectItem(p))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
