import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { execSync } from "child_process";
import { basename } from "path";
import { homedir } from "os";
import { Project, ResolvedConfig } from "./types";
import { launchApp, openConfigFile, runScript } from "./actions";
import { parseShortcut } from "./shortcuts";
import AddProjectCommand from "./add-project";

interface ProjectActionsProps {
  project: Project;
  config: ResolvedConfig;
  onRefresh: () => void;
}

interface ActionDetail {
  type: string;
  app?: string;
  command?: string;
  shortcutLabel?: string;
  markdown?: string;
}

interface ActionItem {
  id: string;
  title: string;
  icon: { source: Icon; tintColor?: Color };
  section: string;
  shortcut?: Keyboard.Shortcut;
  detail: ActionDetail;
  onAction: () => void | Promise<void>;
}

export default function ProjectActions({ project, config, onRefresh }: ProjectActionsProps) {
  const { push, pop } = useNavigation();
  const name = config.name || basename(project.path);

  const actions: ActionItem[] = [];

  const env = config.env;

  // Apps section
  for (const app of config.apps) {
    const iconSource = Icon[app.icon as keyof typeof Icon] ?? Icon.AppWindowGrid2x2;
    const iconColor = app.color ? (Color[app.color as keyof typeof Color] ?? undefined) : undefined;
    actions.push({
      id: `app-${app.label}`,
      title: app.label,
      icon: { source: iconSource, tintColor: iconColor },
      section: "Apps",
      shortcut: parseShortcut(app.shortcut),
      detail: {
        type: "App Launcher",
        app: app.app,
        command: app.command,
        shortcutLabel: app.shortcut,
      },
      onAction: () => launchApp(project, config, app),
    });
  }

  // Scripts section
  for (const script of config.scripts) {
    const iconSource = Icon[script.icon as keyof typeof Icon] ?? Icon.Terminal;
    const iconColor = script.color
      ? (Color[script.color as keyof typeof Color] ?? Color.Orange)
      : Color.Orange;
    actions.push({
      id: `script-${script.label}`,
      title: script.label,
      icon: { source: iconSource, tintColor: iconColor },
      section: "Scripts",
      shortcut: parseShortcut(script.shortcut),
      detail: {
        type: "Background Script",
        command: script.command,
        shortcutLabel: script.shortcut,
      },
      onAction: () => runScript(project, config, script.label, script.command),
    });
  }

  // Manage section
  actions.push({
    id: "edit-project",
    title: "Edit Project",
    icon: { source: Icon.Pencil },
    section: "Manage",
    detail: { type: "Manage" },
    onAction: () =>
      push(
        <AddProjectCommand
          editProject={project}
          onSaved={() => {
            onRefresh();
            pop();
          }}
        />,
      ),
  });

  actions.push({
    id: "edit-config",
    title: "Edit Config File",
    icon: { source: Icon.Document },
    section: "Manage",
    detail: {
      type: "Manage",
      markdown: [
        "## Apps",
        "Shorthands: `editor`, `terminal`,",
        "`git`, `browser`",
        "",
        "Full entry:",
        "```json",
        "{",
        '  "label": "Dev Server",',
        '  "app": "AppName",',
        '  "command": "cd ${dir} && npm run dev",',
        '  "icon": "Terminal",',
        '  "color": "Green",',
        '  "shortcut": "cmd+d"',
        "}",
        "```",
        "- `app` — open via `open -a`",
        "- `command` — run in terminal",
        "- `${dir}` — project path",
        "- `${url}` — meta.url value",
        "",
        "## Scripts",
        "Background commands (no terminal):",
        "```json",
        "{",
        '  "label": "Build",',
        '  "command": "cd ${dir} && npm run build",',
        '  "icon": "Hammer",',
        '  "color": "Orange",',
        '  "shortcut": "cmd+b"',
        "}",
        "```",
      ].join("\n"),
    },
    onAction: () => openConfigFile(project, config),
  });

  // Group by section
  const sections = new Map<string, ActionItem[]>();
  for (const a of actions) {
    const group = sections.get(a.section) ?? [];
    group.push(a);
    sections.set(a.section, group);
  }

  function actionDetail(detail: ActionDetail) {
    if (detail.markdown) {
      return <List.Item.Detail markdown={detail.markdown} />;
    }

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Type" text={detail.type} />
            {detail.app && <List.Item.Detail.Metadata.Label title="App" text={detail.app} />}
            {detail.command && <List.Item.Detail.Metadata.Label title="Command" text={detail.command} />}
            {detail.shortcutLabel && (
              <List.Item.Detail.Metadata.Label title="Shortcut" text={detail.shortcutLabel} />
            )}
            {env && Object.keys(env).length > 0 && detail.type !== "Manage" && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Environment" />
                {Object.entries(env).map(([key, value]) => (
                  <List.Item.Detail.Metadata.Label key={key} title={`  ${key}`} text={value} />
                ))}
              </>
            )}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  function projectDeeplink(projectId: string): string {
    const context = encodeURIComponent(JSON.stringify({ projectId }));
    return `raycast://extensions/philipp/dev-project-launcher/list-projects?context=${context}`;
  }

  return (
    <List navigationTitle={name} searchBarPlaceholder={`${name} — Search actions…`} isShowingDetail>
      <List.Section title="Info">
        <List.Item
          id="info-project"
          title={name}
          icon={{ source: Icon[config.meta.icon as keyof typeof Icon] ?? Icon.Folder, tintColor: Color[config.meta.color as keyof typeof Color] ?? Color.Blue }}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Path" text={project.path.replace(homedir(), "~")} />
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
                  {config.meta.url && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link title="URL" text={config.meta.url} target={config.meta.url} />
                    </>
                  )}
                  {env && Object.keys(env).length > 0 && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Environment" />
                      {Object.entries(env).map(([key, value]) => (
                        <List.Item.Detail.Metadata.Label key={key} title={`  ${key}`} text={value} />
                      ))}
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Open in Finder"
                icon={Icon.Finder}
                onAction={() => {
                  execSync(`open "${project.path}"`, { timeout: 5000 });
                }}
              />
              <ActionPanel.Section title="Shortcuts">
                {actions
                  .filter((a) => a.shortcut)
                  .map((a) => (
                    <Action
                      key={a.id}
                      title={a.title}
                      icon={a.icon}
                      shortcut={a.shortcut}
                      onAction={a.onAction}
                    />
                  ))}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>
      {[...sections.entries()].map(([section, items]) => (
        <List.Section key={section} title={section}>
          {items.map((item) => (
            <List.Item
              key={item.id}
              title={item.title}
              icon={item.icon}
              detail={actionDetail(item.detail)}
              actions={
                <ActionPanel>
                  <Action title={item.title} icon={item.icon} shortcut={item.shortcut} onAction={item.onAction} />
                  <ActionPanel.Section title="Shortcuts">
                    {actions
                      .filter((a) => a.shortcut && a.id !== item.id)
                      .map((a) => (
                        <Action
                          key={a.id}
                          title={a.title}
                          icon={a.icon}
                          shortcut={a.shortcut}
                          onAction={a.onAction}
                        />
                      ))}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage">
                    <Action.CreateQuicklink
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      quicklink={{
                        name: `Project: ${name}`,
                        link: projectDeeplink(project.id),
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
