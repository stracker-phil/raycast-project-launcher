import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { execSync } from "child_process";
import { useState, useEffect, useCallback } from "react";
import { basename } from "path";
import { homedir } from "os";
import { Project, ResolvedConfig } from "./types";
import { setArchived, setStarred } from "./config";
import { launchApp, openConfigFile, runScript } from "./actions";
import { friendlyCliName, friendlyUrlName, parseShortcut, renderShortcut } from "./shortcuts";
import AddProjectCommand from "./add-project";

interface ProjectActionsProps {
  project: Project;
  config: ResolvedConfig;
  onRefresh: () => void;
}

interface ActionDetail {
  type: string;
  app?: string;
  args?: string;
  command?: string;
  url?: string;
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

  // Project-level active states (resolved from stateProviders + states map)
  // activeStateKeys: value keys for hiddenStates matching (e.g. ["web_on", "xdebug_off"])
  // activeStateDisplay: label pairs for the detail panel (e.g. [{label: "Web service", value: "Running"}])
  const [activeStateKeys, setActiveStateKeys] = useState<string[]>([]);
  const [activeStateDisplay, setActiveStateDisplay] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [statesLoading, setStatesLoading] = useState(
    () => !!(config.stateProviders && config.states && Object.keys(config.states).length > 0),
  );

  const stateEnv = useCallback(
    () => ({
      ...process.env,
      PATH: [
        "/usr/local/bin",
        "/opt/homebrew/bin",
        "/usr/bin",
        "/bin",
        "/usr/sbin",
        "/sbin",
        process.env.PATH,
      ].join(":"),
      ...config.env,
    }),
    [config.env],
  );

  const resolveStates = useCallback(() => {
    const statesMap = config.states;
    if (!statesMap || Object.keys(statesMap).length === 0) {
      setStatesLoading(false);
      return;
    }

    const providers = config.stateProviders ?? {};
    const providerCache: Record<string, { raw: string; json?: unknown }> = {};

    function getProviderOutput(providerName: string): { raw: string; json?: unknown } | undefined {
      if (providerName in providerCache) return providerCache[providerName];
      const command = providers[providerName];
      if (!command) return undefined;
      try {
        const raw = execSync(command, {
          cwd: project.path,
          encoding: "utf-8",
          timeout: 5000,
          env: stateEnv(),
        }).trim();
        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          /* plain text */
        }
        providerCache[providerName] = { raw, json };
      } catch {
        providerCache[providerName] = { raw: "" };
      }
      return providerCache[providerName];
    }

    function extractPath(obj: unknown, path: string): string | undefined {
      const parts = path.split(".").filter(Boolean);
      let current: unknown = obj;
      for (const part of parts) {
        if (current == null || typeof current !== "object") return undefined;
        current = (current as Record<string, unknown>)[part];
      }
      return current == null ? undefined : String(current);
    }

    const keys: string[] = [];
    const display: { label: string; value: string }[] = [];

    for (const [, state] of Object.entries(statesMap)) {
      const source = state.source;
      const colonIdx = source.indexOf(":");
      let rawValue: string | undefined;

      if (colonIdx > 0 && source[colonIdx + 1] === ".") {
        const providerName = source.slice(0, colonIdx);
        const jsonPath = source.slice(colonIdx + 1);
        const output = getProviderOutput(providerName);
        rawValue = output?.json !== undefined ? extractPath(output.json, jsonPath) : undefined;
      } else if (providers[source]) {
        const output = getProviderOutput(source);
        rawValue = output?.raw || undefined;
      }

      if (rawValue === undefined) continue;

      // Find the matching value entry by raw value
      const matchedEntry = Object.entries(state.values).find(([, v]) => v.value === rawValue);
      if (matchedEntry) {
        keys.push(matchedEntry[0]);
        display.push({ label: state.label, value: matchedEntry[1].label });
      } else {
        // Fallback: no matching value, show raw value
        display.push({ label: state.label, value: rawValue });
      }
    }

    setActiveStateKeys(keys);
    setActiveStateDisplay(display);
    setStatesLoading(false);
  }, [config.states, config.stateProviders, project.path, stateEnv]);

  useEffect(() => {
    resolveStates();
  }, [resolveStates]);

  const actions: ActionItem[] = [];

  const env = config.env;

  for (const app of config.apps) {
    if (!statesLoading && app.hiddenStates) {
      if (app.hiddenStates.some((hs) => activeStateKeys.includes(hs))) continue;
    }
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
        args: app.args,
        command: app.command,
        url: app.url,
        shortcutLabel: renderShortcut(app.shortcut),
      },
      onAction: () => launchApp(project, config, app),
    });
  }

  // Scripts section — hide scripts whose hiddenStates match active state labels
  for (const script of config.scripts) {
    if (!statesLoading && script.hiddenStates) {
      if (script.hiddenStates.some((hs) => activeStateKeys.includes(hs))) continue;
    }
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
        shortcutLabel: renderShortcut(script.shortcut),
      },
      onAction: async () => {
        await runScript(project, config, script.label, script.command);
        resolveStates();
      },
    });
  }

  actions.push({
    id: "edit-project",
    title: "Edit Project",
    icon: { source: Icon.Pencil },
    section: "Manage",
    shortcut: { modifiers: ["cmd"], key: "e" },
    detail: { type: "Manage", shortcutLabel: renderShortcut("cmd+e") },
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
    shortcut: { modifiers: ["cmd", "shift"], key: "e" },
    detail: {
      shortcutLabel: renderShortcut("cmd+shift+e"),
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
        '  "args": "${dir}/file.txt",',
        '  "command": "cd ${dir} && npm run dev",',
        '  "icon": "Terminal",',
        '  "color": "Green",',
        '  "shortcut": "cmd+d"',
        "}",
        "```",
        "- `app` — CLI binary, spawned silently with project env vars",
        "- `args` — file/path for `app` (default: project dir)",
        "- `command` — run in terminal",
        "- `${dir}` — project path",
        "- `${url}` — meta.url value",
        "- `~` — expands to home directory",
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

  actions.push({
    id: "toggle-star",
    title: config.meta.starred ? "Unstar Project" : "Star Project",
    icon: { source: config.meta.starred ? Icon.StarDisabled : Icon.Star },
    section: "Manage",
    shortcut: { modifiers: ["ctrl"], key: "s" },
    detail: {
      type: "Manage",
      shortcutLabel: renderShortcut("ctrl+s"),
    },
    onAction: async () => {
      const newState = !config.meta.starred;
      setStarred(project.path, newState);
      await showToast(Toast.Style.Success, `${newState ? "Starred" : "Unstarred"} ${name}`);
      onRefresh();
      pop();
    },
  });

  actions.push({
    id: "toggle-archive",
    title: config.meta.archived ? "Unarchive Project" : "Archive Project",
    icon: { source: config.meta.archived ? Icon.ArrowCounterClockwise : Icon.Tray },
    section: "Manage",
    shortcut: config.meta.archived
      ? { modifiers: ["ctrl"], key: "u" }
      : { modifiers: ["ctrl"], key: "a" },
    detail: {
      type: "Manage",
      shortcutLabel: renderShortcut(config.meta.archived ? "ctrl+u" : "ctrl+a"),
    },
    onAction: async () => {
      const newState = !config.meta.archived;
      setArchived(project.path, newState);
      await showToast(Toast.Style.Success, `${newState ? "Archived" : "Unarchived"} ${name}`);
      onRefresh();
      pop();
    },
  });

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
            {detail.type === "App Launcher" && (
              <List.Item.Detail.Metadata.Label
                title="App"
                text={
                  detail.app
                    ? friendlyCliName(detail.app)
                    : detail.url
                      ? friendlyUrlName(detail.url)
                      : "Terminal"
                }
              />
            )}
            {detail.args && (
              <List.Item.Detail.Metadata.Label
                title="Args"
                text={detail.args.replace(homedir(), "~")}
              />
            )}
            {detail.command && (
              <List.Item.Detail.Metadata.Label title="Command" text={detail.command} />
            )}
            {detail.url && <List.Item.Detail.Metadata.Label title="URL" text={detail.url} />}
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
            {activeStateDisplay.length > 0 && detail.type !== "Manage" && (
              <>
                <List.Item.Detail.Metadata.Separator />
                {activeStateDisplay.map((s) => (
                  <List.Item.Detail.Metadata.Label key={s.label} title={s.label} text={s.value} />
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
          icon={{
            source: Icon[config.meta.icon as keyof typeof Icon] ?? Icon.Folder,
            tintColor: Color[config.meta.color as keyof typeof Color] ?? Color.Blue,
          }}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Path"
                    text={project.path.replace(homedir(), "~")}
                  />
                  {config.meta.tag && (
                    <List.Item.Detail.Metadata.TagList title="Tag">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={config.meta.tag}
                        color={Color.Blue}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {config.meta.notes &&
                    (Array.isArray(config.meta.notes) ? (
                      config.meta.notes.map((line, i) => (
                        <List.Item.Detail.Metadata.Label
                          key={i}
                          title={i ? "" : "Notes"}
                          text={line}
                        />
                      ))
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Notes" text={config.meta.notes} />
                    ))}
                  {config.isGitRepo && config.git && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Git Branch"
                        text={config.git.branch}
                      />
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
                  {env && Object.keys(env).length > 0 && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Environment" />
                      {Object.entries(env).map(([key, value]) => (
                        <List.Item.Detail.Metadata.Label
                          key={key}
                          title={`  ${key}`}
                          text={value}
                        />
                      ))}
                    </>
                  )}
                  {activeStateDisplay.length > 0 && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      {activeStateDisplay.map((s) => (
                        <List.Item.Detail.Metadata.Label
                          key={s.label}
                          title={s.label}
                          text={s.value}
                        />
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
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => {
                  execSync(`open "${project.path}"`, { timeout: 5000 });
                }}
              />
              <Action.CopyToClipboard
                title="Copy Path to Clipboard"
                content={project.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
                  <Action
                    title={item.title}
                    icon={item.icon}
                    shortcut={item.shortcut}
                    onAction={item.onAction}
                  />
                  <ActionPanel.Section title="Shortcuts">
                    <Action
                      title="Open in Finder"
                      icon={Icon.Finder}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() => execSync(`open "${project.path}"`, { timeout: 5000 })}
                    />
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
                  {item.detail.command && (
                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard
                        title="Copy Command to Clipboard"
                        content={item.detail.command}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    </ActionPanel.Section>
                  )}
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
