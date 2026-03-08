import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { Project } from "./types";
import { addProject, updateProject, generateId } from "./storage";
import { readConfig, writeConfig } from "./config";
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
    });

    if (isEditing) {
      await updateProject(project);
      await showToast(Toast.Style.Success, "Project updated");
    } else {
      await addProject(project);
      await showToast(Toast.Style.Success, "Project added");
      await openConfigFile(project);
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
                await openConfigFile(editProject);
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
    </Form>
  );
}
