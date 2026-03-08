import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Project, ResolvedConfig } from "./types";
import { loadProjects, removeProject } from "./storage";
import { resolveConfig } from "./config";
import { openInEditor, openTerminal, openInBrowser, openGitClient, openInFinder, trashConfigFile } from "./actions";
import AddProjectCommand from "./add-project";
import ProjectActions from "./project-actions";

interface ProjectWithConfig {
  project: Project;
  config: ResolvedConfig;
}

interface LaunchContext {
  projectId: string;
}

export default function ListProjectsCommand(
  props: LaunchProps<{ launchContext?: LaunchContext }>,
) {
  const contextId = props.launchContext?.projectId;
  const [items, setItems] = useState<ProjectWithConfig[]>([]);
  const [directMatch, setDirectMatch] = useState<ProjectWithConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function refresh() {
    setIsLoading(true);
    const loaded = await loadProjects();
    const resolved = loaded.map((project) => ({ project, config: resolveConfig(project) }));

    if (contextId) {
      const match = resolved.find((item) => item.project.id === contextId);
      if (match) {
        setDirectMatch(match);
        setIsLoading(false);
        return;
      }
    }

    resolved.sort((a, b) => a.config.name.localeCompare(b.config.name));
    setItems(resolved);
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  // Deep link: go directly to project actions
  if (directMatch) {
    return (
      <ProjectActions
        project={directMatch.project}
        config={directMatch.config}
        onRefresh={refresh}
      />
    );
  }

  // Group by tag
  const tagged = new Map<string, ProjectWithConfig[]>();
  const untagged: ProjectWithConfig[] = [];

  for (const item of items) {
    if (item.project.tag) {
      const group = tagged.get(item.project.tag) ?? [];
      group.push(item);
      tagged.set(item.project.tag, group);
    } else {
      untagged.push(item);
    }
  }

  const sortedTags = [...tagged.keys()].sort();

  async function handleDelete(project: Project, name: string) {
    if (
      await confirmAlert({
        title: `Remove "${name}"?`,
        message: "This removes it from the launcher and moves .project-launcher.json to the trash.",
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await trashConfigFile(project);
      await removeProject(project.id);
      await showToast(Toast.Style.Success, `Removed ${name}`);
      await refresh();
    }
  }

  function projectItem({ project, config }: ProjectWithConfig) {
    const accessories: List.Item.Accessory[] = [];
    if (config.isGitRepo) {
      accessories.push({ icon: Icon.CodeBlock, tooltip: "Git repo" });
    }
    if (config.url) {
      accessories.push({ icon: Icon.Globe });
    }
    if (config.start) {
      accessories.push({ icon: Icon.Play, tooltip: "Has services" });
    }

    return (
      <List.Item
        key={project.id}
        title={config.name}
        subtitle={project.path}
        icon={{ source: Icon.Folder, tintColor: Color.Blue }}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Actions">
              <Action
                title="Show Actions"
                icon={Icon.List}
                onAction={() =>
                  push(
                    <ProjectActions project={project} config={config} onRefresh={refresh} />,
                  )
                }
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Quick Actions">
              <Action
                title={`Open in ${config.editor}`}
                icon={Icon.Code}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => openInEditor(project, config)}
              />
              <Action
                title="Open Terminal Here"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => openTerminal(project, config)}
              />
              <Action
                title="Open Finder Here"
                icon={Icon.Finder}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => openInFinder(project)}
              />
              {config.isGitRepo && (
                <Action
                  title="Open Git Client"
                  icon={Icon.CodeBlock}
                  shortcut={{ modifiers: ["cmd"], key: "g" }}
                  onAction={() => openGitClient(project, config)}
                />
              )}
              {config.url && (
                <Action
                  title="Open in Browser"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                  onAction={() => openInBrowser(config.url!)}
                />
              )}
            </ActionPanel.Section>

            <ActionPanel.Section title="Manage">
              <Action
                title="Edit Project"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() =>
                  push(<AddProjectCommand editProject={project} onSaved={refresh} />)
                }
              />
              <Action.CreateQuicklink
                shortcut={{ modifiers: ["cmd"], key: "p" }}
                quicklink={{
                  name: `Project: ${config.name}`,
                  link: projectDeeplink(project.id),
                }}
              />
              <Action
                title="Remove Project"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(project, config.name)}
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
      {items.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No projects yet"
          description="Press Enter to add your first project"
          icon={Icon.Plus}
        />
      ) : (
        <>
          {sortedTags.map((tag) => (
            <List.Section key={tag} title={tag}>
              {tagged.get(tag)!.map((item) => projectItem(item))}
            </List.Section>
          ))}
          {untagged.length > 0 && (
            <List.Section title={sortedTags.length > 0 ? "Untagged" : "Projects"}>
              {untagged.map((item) => projectItem(item))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function projectDeeplink(projectId: string): string {
  const context = encodeURIComponent(JSON.stringify({ projectId }));
  return `raycast://extensions/philipp/dev-project-launcher/list-projects?context=${context}`;
}
