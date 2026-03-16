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
  getLastFilter,
  getLastOpenedProjectId,
  loadConfigCache,
  loadProjects,
  removeProject,
  saveConfigCache,
  setLastFilter,
  setLastOpenedProjectId,
} from "./storage";
import { basename } from "path";
import { homedir } from "os";
import { resolveConfig, setArchived, setStarred } from "./config";
import { launchApp, openConfigFile, runScript, trashConfigFile } from "./actions";
import { friendlyAppName, parseShortcut } from "./shortcuts";
import AddProjectCommand from "./add-project";
import ProjectActions from "./project-actions";

interface ProjectWithConfig {
  project: Project;
  config: ResolvedConfig;
}

interface LaunchContext {
  projectId: string;
}

function projectName(config: ResolvedConfig, project: Project): string {
  return config.name || basename(project.path);
}

export default function ListProjectsCommand(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const contextId = props.launchContext?.projectId;
  const [listState, setListState] = useState<{
    items: ProjectWithConfig[];
    lastOpenedId: string | undefined;
    isLoading: boolean;
  }>({ items: [], lastOpenedId: undefined, isLoading: true });
  const [directMatch, setDirectMatch] = useState<ProjectWithConfig | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selection, setSelection] = useState<string | undefined>(undefined);
  const { push } = useNavigation();

  const { items, lastOpenedId, isLoading } = listState;

  useEffect(() => {
    if (items.length > 0 && lastOpenedId) {
      setTimeout(() => setSelection(lastOpenedId), 50);
    }
  }, [items.length, lastOpenedId]);

  useEffect(() => {
    (async () => {
      const [loaded, storedLastId, cachedConfigs, savedFilter] = await Promise.all([
        loadProjects(),
        getLastOpenedProjectId(),
        loadConfigCache(),
        getLastFilter(),
      ]);

      let items: ProjectWithConfig[];
      try {
        const hasCachedAll = loaded.every((p) => cachedConfigs[p.id]);
        items = hasCachedAll
          ? loaded.map((project) => {
              const config = cachedConfigs[project.id];
              if (!config?.name && !config?.meta) throw new Error("stale cache");
              return { project, config };
            })
          : loaded.map((project) => ({ project, config: resolveConfig(project) }));
      } catch {
        // Cache is unusable — resolve everything fresh and replace cache now
        items = loaded.map((project) => ({ project, config: resolveConfig(project) }));
        const freshCache: Record<string, ResolvedConfig> = {};
        for (const item of items) {
          freshCache[item.project.id] = item.config;
        }
        saveConfigCache(freshCache);
      }

      items.sort((a, b) =>
        projectName(a.config, a.project).localeCompare(projectName(b.config, b.project)),
      );

      if (savedFilter && savedFilter !== "all") {
        const activeItems = items.filter((i) => !i.config.meta.archived);
        const validFilters = new Set<string>([
          "starred",
          "archived",
          "untagged",
          ...activeItems.map((i) => i.config.meta.tag).filter(Boolean) as string[],
        ]);
        if (validFilters.has(savedFilter)) {
          setSelectedTag(savedFilter);
        }
      }

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

    resolved.sort((a, b) =>
      projectName(a.config, a.project).localeCompare(projectName(b.config, b.project)),
    );
    setListState((s) => ({ ...s, items: resolved, isLoading: false }));
  }

  if (directMatch) {
    return (
      <ProjectActions
        project={directMatch.project}
        config={directMatch.config}
        onRefresh={refresh}
      />
    );
  }

  const activeItems = items.filter((item) => !item.config.meta.archived);
  const starredItems = activeItems.filter((item) => item.config.meta.starred);
  const archivedItems = items.filter((item) => item.config.meta.archived);
  const hasStarred = starredItems.length > 0;
  const hasArchived = archivedItems.length > 0;

  const allTags = [
    ...new Set(activeItems.map((item) => item.config.meta.tag).filter(Boolean) as string[]),
  ].sort();
  const hasUntagged = activeItems.some((item) => !item.config.meta.tag);

  const filteredItems =
    selectedTag === "starred"
      ? starredItems
      : selectedTag === "archived"
        ? archivedItems
        : selectedTag === "all"
          ? activeItems
          : selectedTag === "untagged"
            ? activeItems.filter((item) => !item.config.meta.tag)
            : activeItems.filter((item) => item.config.meta.tag === selectedTag);

  const tagged = new Map<string, ProjectWithConfig[]>();
  const untagged: ProjectWithConfig[] = [];

  for (const item of filteredItems) {
    if (item.config.meta.tag) {
      const group = tagged.get(item.config.meta.tag) ?? [];
      group.push(item);
      tagged.set(item.config.meta.tag, group);
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
            <List.Item.Detail.Metadata.Label
              title="Path"
              text={project.path.replace(homedir(), "~")}
            />
            {config.meta.tag && (
              <List.Item.Detail.Metadata.TagList title="Tag">
                <List.Item.Detail.Metadata.TagList.Item text={config.meta.tag} color={Color.Blue} />
              </List.Item.Detail.Metadata.TagList>
            )}
            {config.meta.notes && (
              <List.Item.Detail.Metadata.Label title="Notes" text={config.meta.notes} />
            )}
            {config.isGitRepo && config.git && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Git Branch" text={config.git.branch} />
                <List.Item.Detail.Metadata.TagList title="Git Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={config.git.dirty ? "Uncommitted Changes" : "Clean"}
                    color={config.git.dirty ? Color.Orange : Color.Green}
                  />
                </List.Item.Detail.Metadata.TagList>
              </>
            )}
            {(config.meta.url || config.meta.repoUrl) && (
              <>
                <List.Item.Detail.Metadata.Separator />
                {config.meta.url && (
                  <List.Item.Detail.Metadata.Link
                    title="URL"
                    text={config.meta.url}
                    target={config.meta.url}
                  />
                )}
                {config.meta.repoUrl && (
                  <List.Item.Detail.Metadata.Link
                    title="Repository"
                    text={config.meta.repoUrl}
                    target={config.meta.repoUrl}
                  />
                )}
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
                    text={friendlyAppName(app)}
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
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  function projectItem({ project, config }: ProjectWithConfig) {
    const name = projectName(config, project);
    const iconSource = Icon[config.meta.icon as keyof typeof Icon] ?? Icon.Folder;
    const iconColor = Color[config.meta.color as keyof typeof Color] ?? Color.Blue;

    return (
      <List.Item
        key={project.id}
        id={project.id}
        title={name}
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

            {config.apps.length > 0 && (
              <ActionPanel.Section title="Project Apps">
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
            )}

            {config.scripts.length > 0 && (
              <ActionPanel.Section title="Project Scripts">
                {config.scripts.map((script) => (
                  <Action
                    key={script.label}
                    title={script.label}
                    icon={Icon[script.icon as keyof typeof Icon] ?? Icon.Terminal}
                    shortcut={parseShortcut(script.shortcut)}
                    onAction={() => runScript(project, config, script.label, script.command)}
                  />
                ))}
              </ActionPanel.Section>
            )}

            <ActionPanel.Section title="Copy">
              <Action.CopyToClipboard
                title="Copy Path to Clipboard"
                content={project.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Manage">
              <Action
                title="Edit Project"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() => push(<AddProjectCommand editProject={project} onSaved={refresh} />)}
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
                  name: `Project: ${name}`,
                  link: projectDeeplink(project.id),
                }}
              />
              <Action
                title="Add Project"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() =>
                  push(
                    <AddProjectCommand
                      onSaved={async (newProject) => {
                        await refresh();
                        if (newProject) {
                          const newConfig = resolveConfig(newProject);
                          push(
                            <ProjectActions
                              project={newProject}
                              config={newConfig}
                              onRefresh={refresh}
                            />,
                          );
                        }
                      }}
                    />,
                  )
                }
              />
              {config.meta.starred ? (
                <Action
                  title="Unstar Project"
                  icon={Icon.StarDisabled}
                  shortcut={{ modifiers: ["ctrl"], key: "s" }}
                  onAction={async () => {
                    setStarred(project.path, false);
                    await showToast(Toast.Style.Success, `Unstarred ${name}`);
                    await refresh();
                  }}
                />
              ) : (
                <Action
                  title="Star Project"
                  icon={Icon.Star}
                  shortcut={{ modifiers: ["ctrl"], key: "s" }}
                  onAction={async () => {
                    setStarred(project.path, true);
                    await showToast(Toast.Style.Success, `Starred ${name}`);
                    await refresh();
                  }}
                />
              )}
              {config.meta.archived ? (
                <Action
                  title="Unarchive Project"
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={{ modifiers: ["ctrl"], key: "u" }}
                  onAction={async () => {
                    setArchived(project.path, false);
                    await showToast(Toast.Style.Success, `Unarchived ${name}`);
                    await refresh();
                  }}
                />
              ) : (
                <Action
                  title="Archive Project"
                  icon={Icon.Tray}
                  shortcut={{ modifiers: ["ctrl"], key: "a" }}
                  onAction={async () => {
                    setArchived(project.path, true);
                    await showToast(Toast.Style.Success, `Archived ${name}`);
                    await refresh();
                  }}
                />
              )}
              <Action
                title="Remove Project"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(project, name)}
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
        allTags.length > 0 || hasStarred || hasArchived ? (
          <List.Dropdown
          tooltip="Filter by Tag"
          value={selectedTag}
          onChange={(value) => {
            setSelectedTag(value);
            setLastFilter(value);
          }}
        >
            <List.Dropdown.Item title="All Projects" value="all" />
            {hasStarred && <List.Dropdown.Item title="Starred" value="starred" />}
            {allTags.map((tag) => (
              <List.Dropdown.Item key={tag} title={tag} value={tag} />
            ))}
            {hasUntagged && <List.Dropdown.Item title="Untagged" value="untagged" />}
            {hasArchived && <List.Dropdown.Item title="Archived" value="archived" />}
          </List.Dropdown>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Add Project"
            icon={Icon.Plus}
            onAction={() =>
              push(
                <AddProjectCommand
                  onSaved={async (newProject) => {
                    await refresh();
                    if (newProject) {
                      const newConfig = resolveConfig(newProject);
                      push(
                        <ProjectActions
                          project={newProject}
                          config={newConfig}
                          onRefresh={refresh}
                        />,
                      );
                    }
                  }}
                />,
              )
            }
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
