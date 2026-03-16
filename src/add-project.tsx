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
import { useEffect, useState } from "react";
import { existsSync } from "fs";
import { join } from "path";
import { Project, PROJECT_ICONS, PROJECT_COLORS } from "./types";
import { addProject, updateProject, generateId, loadProjects } from "./storage";
import { readConfig, writeConfig, resolveConfig, readAllTags, CONFIG_FILENAME } from "./config";
import { openConfigFile } from "./actions";

const NEW_TAG_VALUE = "__new__";
const NO_TAG_VALUE = "";
const CUSTOM_ICON_VALUE = "__custom__";

const PROJECT_ICONS_SET = new Set<string>(PROJECT_ICONS);

interface AddProjectProps {
  editProject?: Project;
  onSaved?: (project?: Project) => void;
}

export default function AddProjectCommand(props: AddProjectProps) {
  const { editProject, onSaved } = props;
  const isEditing = !!editProject;
  const { pop } = useNavigation();

  const fileConfig = isEditing ? readConfig(editProject.path) : null;

  const [pathError, setPathError] = useState<string | undefined>();
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [importExisting, setImportExisting] = useState(true);
  const hideConfigFields = !isEditing && hasExistingConfig && importExisting;
  const [existingTags, setExistingTags] = useState<string[] | null>(null);
  const tagsLoaded = existingTags !== null;
  const [tagSelection, setTagSelection] = useState<string>(() => fileConfig?.meta?.tag ?? NO_TAG_VALUE);
  const [customTag, setCustomTag] = useState("");

  const configIcon = fileConfig?.meta?.icon ?? "Folder";
  const isCustomIcon = configIcon !== "Folder" && !PROJECT_ICONS_SET.has(configIcon);
  const [iconSelection, setIconSelection] = useState<string>(isCustomIcon ? CUSTOM_ICON_VALUE : configIcon);
  const [customIcon, setCustomIcon] = useState(isCustomIcon ? configIcon : "");

  useEffect(() => {
    loadProjects().then((projects) => {
      setExistingTags(readAllTags(projects));
    });
  }, []);

  async function handleSubmit(values: {
    path: string[];
    name: string;
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
      createdAt: editProject?.createdAt ?? new Date().toISOString(),
    };

    if (!hideConfigFields) {
      const tag = tagSelection === NEW_TAG_VALUE ? customTag.trim() : tagSelection === NO_TAG_VALUE ? undefined : tagSelection;
      const icon = iconSelection === CUSTOM_ICON_VALUE ? (customIcon.trim() || "Folder") : iconSelection;
      const existingConfig = readConfig(projectPath);
      writeConfig(projectPath, {
        name: values.name.trim() || undefined,
        meta: {
          ...existingConfig?.meta,
          icon: icon,
          color: values.color || "Blue",
          tag: tag || undefined,
          notes: (() => {
          const lines = values.notes.trim().split("\n").filter((l) => l.trim() !== "");
          if (lines.length === 0) return undefined;
          return lines.length === 1 ? lines[0] : lines;
        })(),
        },
      });
    }

    if (isEditing) {
      await updateProject(project);
      await showToast(Toast.Style.Success, "Project updated");
    } else {
      await addProject(project);
      await showToast(Toast.Style.Success, "Project added");
    }

    onSaved?.(project);
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
          onChange={(paths) => {
            if (pathError) setPathError(undefined);
            const selected = paths?.[0];
            if (selected && existsSync(join(selected, CONFIG_FILENAME))) {
              setHasExistingConfig(true);
              setImportExisting(true);
            } else {
              setHasExistingConfig(false);
            }
          }}
        />
      )}

      {hasExistingConfig && !isEditing && (
        <Form.Checkbox
          id="importExisting"
          label="Import existing configuration"
          value={importExisting}
          onChange={setImportExisting}
          info="This folder already has a .project-launcher.json — check to keep it as-is"
        />
      )}

      {!hideConfigFields && (
        <>
          <Form.TextField
            id="name"
            title="Name"
            placeholder="My Project"
            defaultValue={fileConfig?.name ?? ""}
            info={isEditing ? "From .project-launcher.json" : "Set after adding via config file"}
          />

          <Form.Dropdown
            id="tagDropdown"
            title="Tag"
            value={tagSelection}
            onChange={setTagSelection}
            info="Used to group projects in the list"
            isLoading={!tagsLoaded}
          >
            <Form.Dropdown.Item title="No Tag" value={NO_TAG_VALUE} icon={Icon.Minus} />
            {fileConfig?.meta?.tag && !tagsLoaded && (
              <Form.Dropdown.Item key={fileConfig.meta.tag} title={fileConfig.meta.tag} value={fileConfig.meta.tag} icon={Icon.Tag} />
            )}
            {(existingTags ?? []).map((tag) => (
              <Form.Dropdown.Item key={tag} title={tag} value={tag} icon={Icon.Tag} />
            ))}
            <Form.Dropdown.Item title="New Tag…" value={NEW_TAG_VALUE} icon={Icon.Plus} />
          </Form.Dropdown>

          {tagSelection === NEW_TAG_VALUE && (
            <Form.TextField
              id="customTag"
              title="New Tag"
              placeholder="client, hobby, work…"
              value={customTag}
              onChange={setCustomTag}
            />
          )}

          <Form.Dropdown
            id="icon"
            title="Icon"
            value={iconSelection}
            onChange={setIconSelection}
          >
            {PROJECT_ICONS.map((name) => (
              <Form.Dropdown.Item
                key={name}
                value={name}
                title={name}
                icon={{ source: Icon[name as keyof typeof Icon], tintColor: Color.PrimaryText }}
              />
            ))}
            <Form.Dropdown.Item title="Custom Icon…" value={CUSTOM_ICON_VALUE} icon={Icon.Pencil} />
          </Form.Dropdown>

          {iconSelection === CUSTOM_ICON_VALUE && (
            <Form.TextField
              id="customIcon"
              title="Icon Name"
              placeholder="Raycast Icon name, e.g. Airplane"
              value={customIcon}
              onChange={setCustomIcon}
              info="Any valid Raycast Icon enum name"
            />
          )}

          <Form.Dropdown
            id="color"
            title="Color"
            defaultValue={fileConfig?.meta?.color ?? "Blue"}
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

          <Form.TextArea
            id="notes"
            title="Notes"
            placeholder="Free-form notes about this project…"
            defaultValue={
              Array.isArray(fileConfig?.meta?.notes)
                ? fileConfig.meta.notes.join("\n")
                : (fileConfig?.meta?.notes ?? "")
            }
          />
        </>
      )}
    </Form>
  );
}
