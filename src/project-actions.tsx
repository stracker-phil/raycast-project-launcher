import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { Project, ResolvedConfig } from "./types";
import {
  openInEditor,
  openTerminal,
  startServices,
  stopServices,
  openInBrowser,
  openGitClient,
  openInFinder,
  runScript,
} from "./actions";
import AddProjectCommand from "./add-project";

interface ProjectActionsProps {
  project: Project;
  config: ResolvedConfig;
  onRefresh: () => void;
}

interface ActionItem {
  id: string;
  title: string;
  icon: { source: Icon; tintColor?: Color };
  section: string;
  onAction: () => void | Promise<void>;
}

export default function ProjectActions({ project, config, onRefresh }: ProjectActionsProps) {
  const { push, pop } = useNavigation();

  const actions: ActionItem[] = [
    {
      id: "editor",
      title: `Open in ${config.editor}`,
      icon: { source: Icon.Code },
      section: "Launch",
      onAction: () => openInEditor(project, config),
    },
    {
      id: "terminal",
      title: "Open Terminal Here",
      icon: { source: Icon.Terminal },
      section: "Launch",
      onAction: () => openTerminal(project, config),
    },
    {
      id: "finder",
      title: "Open Finder Here",
      icon: { source: Icon.Finder },
      section: "Launch",
      onAction: () => openInFinder(project),
    },
  ];

  if (config.isGitRepo) {
    actions.push({
      id: "git-client",
      title: "Open Git Client",
      icon: { source: Icon.CodeBlock },
      section: "Launch",
      onAction: () => openGitClient(project, config),
    });
  }

  if (config.url) {
    actions.push({
      id: "browser",
      title: "Open in Browser",
      icon: { source: Icon.Globe },
      section: "Launch",
      onAction: () => openInBrowser(config.url!),
    });
  }

  if (config.start) {
    actions.push({
      id: "start",
      title: "Start Services",
      icon: { source: Icon.Play, tintColor: Color.Green },
      section: "Services",
      onAction: () => startServices(project, config),
    });
  }

  if (config.stop) {
    actions.push({
      id: "stop",
      title: "Stop Services",
      icon: { source: Icon.Stop, tintColor: Color.Red },
      section: "Services",
      onAction: () => stopServices(project, config),
    });
  }

  if (config.scripts) {
    for (const [label, command] of Object.entries(config.scripts)) {
      actions.push({
        id: `script-${label}`,
        title: label,
        icon: { source: Icon.Terminal, tintColor: Color.Orange },
        section: "Scripts",
        onAction: () => runScript(project, config, label, command),
      });
    }
  }

  actions.push({
    id: "edit-project",
    title: "Edit Project",
    icon: { source: Icon.Pencil },
    section: "Manage",
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

  // Group by section
  const sections = new Map<string, ActionItem[]>();
  for (const a of actions) {
    const group = sections.get(a.section) ?? [];
    group.push(a);
    sections.set(a.section, group);
  }

  function projectDeeplink(projectId: string): string {
    const context = encodeURIComponent(JSON.stringify({ projectId }));
    return `raycast://extensions/philipp/dev-project-launcher/list-projects?context=${context}`;
  }

  return (
    <List navigationTitle={config.name} searchBarPlaceholder="Search actions…">
      {[...sections.entries()].map(([section, items]) => (
        <List.Section key={section} title={section}>
          {items.map((item) => (
            <List.Item
              key={item.id}
              title={item.title}
              icon={item.icon}
              actions={
                <ActionPanel>
                  <Action title={item.title} icon={item.icon} onAction={item.onAction} />
                  <Action.CreateQuicklink
                    shortcut={{ modifiers: ["cmd"], key: "p" }}
                    quicklink={{
                      name: `Project: ${config.name}`,
                      link: projectDeeplink(project.id),
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
