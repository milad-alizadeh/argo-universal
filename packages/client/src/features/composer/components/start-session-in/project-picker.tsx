import type { ProjectInfo } from '@repo/contracts';
import type { ReactElement } from 'react';
import { Combobox, type ComboboxOption } from '#primitives/inputs/combobox';

interface ProjectPickerProps {
  projects: ProjectInfo[];
  projectId: string;
  onSelect: (projectId: string) => void;
}

export function ProjectPicker(props: ProjectPickerProps): ReactElement {
  return (
    <Combobox.Content
      label="Projects"
      value={props.projectId}
      searchPlaceholder="Find a Project…"
      emptyLabel="No Project matches."
      options={projectOptions(props.projects)}
      onValueChange={props.onSelect}
    />
  );
}

function projectOptions(projects: ProjectInfo[]): ComboboxOption<string>[] {
  return projects.map((project) => ({
    value: project.id,
    label: project.name,
    supporting: project.path,
    code: true,
    icon: 'folder',
  }));
}
