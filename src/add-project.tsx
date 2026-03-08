import {
  Action,
  ActionPanel,
  Color,
  Form,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { Project, PROJECT_ICONS, PROJECT_COLORS } from "./types";
import { addProject, updateProject, generateId } from "./storage";
import { readConfig, writeConfig, resolveConfig } from "./config";
import { openConfigFile } from "./actions";

interface AddProjectProps {
  editProject?: Project;
  onSaved?: () => void;
}

export default function AddProjectCommand(props: AddProjectProps) {
  const { editProject, onSaved } = props;
  const isEditing = !!editProject;
  const { pop } = useNavigation();

  const fileConfig = isEditing ? readConfig(editProject.path) : null;

  const [pathError, setPathError] = useState<string | undefined>();

  async function handleSubmit(values: {
    path: string[];
    tag: string;
    name: string;
    editor: string;
    url: string;
    start: string;
    stop: string;
    icon: string;
    color: string;
    notes: string;
  }) {
    if (!isEditing && (!values.path || values.path.length === 0)) {
      setPathError("Project folder is required");
      return;
    }

    const projectPath = isEditing ? editProject.path : values.path[0];

    const project: Project = {
      id: editProject?.id ?? generateId(),
      path: projectPath,
      tag: values.tag.trim() || undefined,
      createdAt: editProject?.createdAt ?? new Date().toISOString(),
    };

    // Write form fields to the JSON config (works for both add and edit)
    writeConfig(projectPath, {
      name: values.name.trim() || undefined,
      editor: values.editor.trim() || undefined,
      url: values.url.trim() || undefined,
      start: values.start.trim() || undefined,
      stop: values.stop.trim() || undefined,
      icon: values.icon || "Folder",
      color: values.color || "Blue",
      notes: values.notes.trim() || undefined,
    });

    if (isEditing) {
      await updateProject(project);
      await showToast(Toast.Style.Success, "Project updated");
    } else {
      await addProject(project);
      await showToast(Toast.Style.Success, "Project added");
      const config = resolveConfig(project);
      await openConfigFile(project, config);
    }

    onSaved?.();
    pop();
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Project" : "Add Project"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Add Project"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          {isEditing && (
            <Action
              title="Edit Config File"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={async () => {
                const config = resolveConfig(editProject);
                await openConfigFile(editProject, config);
                onSaved?.();
                pop();
              }}
            />
          )}
        </ActionPanel>
      }
    >
      {!isEditing && (
        <Form.FilePicker
          id="path"
          title="Project Folder"
          allowMultipleSelection={false}
          canChooseDirectories={true}
          canChooseFiles={false}
          error={pathError}
          onChange={() => pathError && setPathError(undefined)}
        />
      )}

      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Project"
        defaultValue={fileConfig?.name ?? ""}
        info={isEditing ? "From .project-launcher.json" : "Set after adding via config file"}
      />

      <Form.TextField
        id="tag"
        title="Tag"
        placeholder="client, hobby, work…"
        defaultValue={editProject?.tag ?? ""}
        info="Used to group projects in the list"
      />

      <Form.Dropdown
        id="icon"
        title="Icon"
        defaultValue={fileConfig?.icon ?? "Folder"}
      >
        {PROJECT_ICONS.map((name) => (
          <Form.Dropdown.Item
            key={name}
            value={name}
            title={name}
            icon={{ source: Icon[name as keyof typeof Icon], tintColor: Color.PrimaryText }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="color"
        title="Color"
        defaultValue={fileConfig?.color ?? "Blue"}
      >
        {PROJECT_COLORS.map((name) => (
          <Form.Dropdown.Item
            key={name}
            value={name}
            title={name}
            icon={{ source: Icon.CircleFilled, tintColor: Color[name as keyof typeof Color] }}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="editor"
        title="Editor"
        placeholder="PhpStorm"
        defaultValue={fileConfig?.editor ?? ""}
        info="App name (e.g. PhpStorm, Cursor, VS Code). Leave empty for default."
      />

      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://myproject.ddev.site"
        defaultValue={fileConfig?.url ?? ""}
      />

      <Form.TextField
        id="start"
        title="Start Command"
        placeholder="ddev start"
        defaultValue={fileConfig?.start ?? ""}
      />

      <Form.TextField
        id="stop"
        title="Stop Command"
        placeholder="ddev stop"
        defaultValue={fileConfig?.stop ?? ""}
      />

      <Form.Separator />

      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Free-form notes about this project…"
        defaultValue={fileConfig?.notes ?? ""}
      />
    </Form>
  );
}
