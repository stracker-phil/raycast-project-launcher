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
import {
  getLastOpenedProjectId,
  loadConfigCache,
  loadProjects,
  removeProject,
  saveConfigCache,
  setLastOpenedProjectId,
} from "./storage";
import { resolveConfig } from "./config";
import { launchApp, openConfigFile, trashConfigFile } from "./actions";
import { parseShortcut } from "./shortcuts";
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
  const [listState, setListState] = useState<{
    items: ProjectWithConfig[];
    lastOpenedId: string | undefined;
    isLoading: boolean;
  }>({ items: [], lastOpenedId: undefined, isLoading: true });
  const [directMatch, setDirectMatch] = useState<ProjectWithConfig | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("all");
  // Deferred selection: set one render after items appear so Raycast's native
  // layer has registered the items before we ask it to select one.
  const [selection, setSelection] = useState<string | undefined>(undefined);
  const { push } = useNavigation();

  const { items, lastOpenedId, isLoading } = listState;

  // Deferred selection: Raycast needs ~50ms to register items before
  // selectedItemId takes effect.
  useEffect(() => {
    if (items.length > 0 && lastOpenedId) {
      setTimeout(() => setSelection(lastOpenedId), 50);
    }
  }, [items.length, lastOpenedId]);

  // Load projects: try cache first for instant render, then resolve fresh
  // configs in the background (only updates cache, never replaces items).
  useEffect(() => {
    (async () => {
      const [loaded, storedLastId, cachedConfigs] = await Promise.all([
        loadProjects(),
        getLastOpenedProjectId(),
        loadConfigCache(),
      ]);

      // Try to build list from cache (instant, no file I/O)
      const hasCachedAll = loaded.every((p) => cachedConfigs[p.id]);
      const items = hasCachedAll
        ? loaded.map((project) => ({ project, config: cachedConfigs[project.id] }))
        : loaded.map((project) => ({ project, config: resolveConfig(project) }));

      items.sort((a, b) => a.config.name.localeCompare(b.config.name));

      if (contextId) {
        const match = items.find((item) => item.project.id === contextId);
        if (match) {
          setDirectMatch(match);
        }
      }

      setListState({
        items,
        lastOpenedId: storedLastId ?? undefined,
        isLoading: false,
      });

      // Background: resolve fresh configs and update cache for next open.
      // Uses setTimeout to avoid blocking the main thread during selection.
      setTimeout(() => {
        const newCache: Record<string, ResolvedConfig> = {};
        for (const project of loaded) {
          newCache[project.id] = resolveConfig(project);
        }
        saveConfigCache(newCache);
      }, 500);
    })();
  }, []);

  /** Full refresh from disk (used by edit/delete actions). */
  async function refresh() {
    setListState((s) => ({ ...s, isLoading: true }));
    const loaded = await loadProjects();
    const resolved = loaded.map((project) => ({
      project,
      config: resolveConfig(project),
    }));

    const newCache: Record<string, ResolvedConfig> = {};
    for (const item of resolved) {
      newCache[item.project.id] = item.config;
    }
    saveConfigCache(newCache);

    resolved.sort((a, b) => a.config.name.localeCompare(b.config.name));
    setListState((s) => ({ ...s, items: resolved, isLoading: false }));
  }

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

  // Collect all tags for the dropdown (from unfiltered items)
  const allTags = [...new Set(items.map((item) => item.project.tag).filter(Boolean) as string[])].sort();
  const hasUntagged = items.some((item) => !item.project.tag);

  // Filter by selected tag
  const filteredItems = selectedTag === "all"
    ? items
    : selectedTag === "untagged"
      ? items.filter((item) => !item.project.tag)
      : items.filter((item) => item.project.tag === selectedTag);

  // Group filtered items by tag
  const tagged = new Map<string, ProjectWithConfig[]>();
  const untagged: ProjectWithConfig[] = [];

  for (const item of filteredItems) {
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

  function projectDetail(config: ResolvedConfig, project: Project) {
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Path" text={project.path} />
            {project.tag && (
              <List.Item.Detail.Metadata.TagList title="Tag">
                <List.Item.Detail.Metadata.TagList.Item text={project.tag} color={Color.Blue} />
              </List.Item.Detail.Metadata.TagList>
            )}
            {config.isGitRepo && config.git && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Git" />
                <List.Item.Detail.Metadata.Label title="  Branch" text={config.git.branch} />
                <List.Item.Detail.Metadata.TagList title="  Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={config.git.dirty ? "Uncommitted Changes" : "Clean"}
                    color={config.git.dirty ? Color.Orange : Color.Green}
                  />
                </List.Item.Detail.Metadata.TagList>
              </>
            )}
            {config.meta.url && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Link title="URL" text={config.meta.url} target={config.meta.url} />
              </>
            )}
            {config.apps.length > 0 && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Apps" />
                {config.apps.map((app) => (
                  <List.Item.Detail.Metadata.Label
                    key={app.label}
                    title={`  ${app.label}`}
                    text={app.app || app.command || ""}
                  />
                ))}
              </>
            )}
            {config.scripts.length > 0 && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Scripts" />
                {config.scripts.map((script) => (
                  <List.Item.Detail.Metadata.Label
                    key={script.label}
                    title={`  ${script.label}`}
                    text={script.command}
                  />
                ))}
              </>
            )}
            {config.env && Object.keys(config.env).length > 0 && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Environment" />
                {Object.entries(config.env).map(([key, value]) => (
                  <List.Item.Detail.Metadata.Label key={key} title={`  ${key}`} text={value} />
                ))}
              </>
            )}
            {config.meta.notes && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Notes" text={config.meta.notes} />
              </>
            )}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  function projectItem({ project, config }: ProjectWithConfig) {
    const iconSource = Icon[config.meta.icon as keyof typeof Icon] ?? Icon.Folder;
    const iconColor = Color[config.meta.color as keyof typeof Color] ?? Color.Blue;

    return (
      <List.Item
        key={project.id}
        id={project.id}
        title={config.name}
        icon={{ source: iconSource, tintColor: iconColor }}
        detail={projectDetail(config, project)}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Actions">
              <Action
                title="Show Actions"
                icon={Icon.List}
                onAction={async () => {
                  await setLastOpenedProjectId(project.id);
                  setListState((s) => ({ ...s, lastOpenedId: project.id }));
                  setSelection(project.id);
                  push(<ProjectActions project={project} config={config} onRefresh={refresh} />);
                }}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Quick Actions">
              {config.apps.map((app) => (
                <Action
                  key={app.label}
                  title={app.label}
                  icon={Icon[app.icon as keyof typeof Icon] ?? Icon.AppWindowGrid2x2}
                  shortcut={parseShortcut(app.shortcut)}
                  onAction={() => launchApp(project, config, app)}
                />
              ))}
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
              <Action
                title="Edit Config File"
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                onAction={() => openConfigFile(project, config)}
              />
              <Action.CreateQuicklink
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
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
      isShowingDetail
      selectedItemId={selection}
      searchBarPlaceholder="Search projects…"
      searchBarAccessory={
        allTags.length > 0 ? (
          <List.Dropdown
            tooltip="Filter by Tag"
            value={selectedTag}
            onChange={setSelectedTag}
          >
            <List.Dropdown.Item title="All Tags" value="all" />
            {allTags.map((tag) => (
              <List.Dropdown.Item key={tag} title={tag} value={tag} />
            ))}
            {hasUntagged && (
              <List.Dropdown.Item title="Untagged" value="untagged" />
            )}
          </List.Dropdown>
        ) : undefined
      }
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
