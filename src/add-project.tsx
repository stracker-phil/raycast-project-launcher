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
import { Project, ProjectType } from "./types";
import { addProject, updateProject, generateId } from "./storage";

interface AddProjectProps {
  editProject?: Project;
  onSaved?: () => void;
}

export default function AddProjectCommand(props: AddProjectProps) {
  const { editProject, onSaved } = props;
  const isEditing = !!editProject;
  const { pop } = useNavigation();

  const [nameError, setNameError] = useState<string | undefined>();
  const [pathError, setPathError] = useState<string | undefined>();

  async function handleSubmit(values: {
    name: string;
    path: string[];
    type: string;
    url: string;
    tag: string;
  }) {
    // Validate
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!values.path || values.path.length === 0) {
      setPathError("Project folder is required");
      return;
    }

    const project: Project = {
      id: editProject?.id ?? generateId(),
      name: values.name.trim(),
      path: values.path[0],
      type: values.type as ProjectType,
      url: values.url.trim() || undefined,
      tag: values.tag.trim() || undefined,
      createdAt: editProject?.createdAt ?? new Date().toISOString(),
    };

    if (isEditing) {
      await updateProject(project);
      await showToast(Toast.Style.Success, `Updated ${project.name}`);
    } else {
      await addProject(project);
      await showToast(Toast.Style.Success, `Added ${project.name}`);
    }

    onSaved?.();
    pop();
  }

  return (
    <Form
      navigationTitle={isEditing ? `Edit ${editProject.name}` : "Add Project"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Add Project"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Project Name"
        placeholder="My Awesome Project"
        defaultValue={editProject?.name ?? ""}
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
      />

      <Form.FilePicker
        id="path"
        title="Project Folder"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={editProject?.path ? [editProject.path] : []}
        error={pathError}
        onChange={() => pathError && setPathError(undefined)}
      />

      <Form.Dropdown id="type" title="Service Type" defaultValue={editProject?.type ?? "ddev"}>
        <Form.Dropdown.Item value="ddev" title="DDEV" icon={Icon.Box} />
        <Form.Dropdown.Item value="docker-compose" title="Docker Compose" icon={Icon.Box} />
        <Form.Dropdown.Item value="none" title="None (plain project)" icon={Icon.Document} />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="url"
        title="Project URL"
        placeholder="https://myproject.ddev.site"
        defaultValue={editProject?.url ?? ""}
        info="Optional — the URL to open in your browser when launching the project"
      />

      <Form.TextField
        id="tag"
        title="Tag"
        placeholder="client, hobby, work…"
        defaultValue={editProject?.tag ?? ""}
        info="Optional — used to group projects in the list"
      />
    </Form>
  );
}
