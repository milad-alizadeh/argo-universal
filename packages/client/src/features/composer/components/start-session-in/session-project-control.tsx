import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Combobox, type ComboboxOption } from '#primitives/inputs/combobox';
import { MenuTrigger } from '#primitives/overlays/menu';
import { ComposerPopover } from '../composer-popover/composer-popover';
import type { StartSessionLayout } from './start-session-types';

// Wide, it sits in the row after the Server; on phones it is a stacked row on the page's inset.
export function SessionProjectControl(
  layout: StartSessionLayout,
): React.JSX.Element {
  const control = <ProjectPopover {...layout} />;

  return layout.wide ? control : <View className="px-4">{control}</View>;
}

function ProjectPopover(layout: StartSessionLayout): React.JSX.Element {
  return (
    <ComposerPopover
      listContent
      label="Project"
      trigger={projectTrigger(layout)}
    >
      {(close) => projectContents(layout, close)}
    </ComposerPopover>
  );
}

function selectProject(
  { props }: StartSessionLayout,
  close: () => void,
  id: string,
): void {
  close();

  if (id !== props.projectId) props.onProjectChange(id);
}

function projectTrigger({ props }: StartSessionLayout): React.JSX.Element {
  const project = props.projects.find((entry) => entry.id === props.projectId);

  return (
    <MenuTrigger
      {...projectButtonLabels(project)}
      icon="folder"
      disabled={props.disabled}
    />
  );
}

type ProjectButtonLabels = { accessibilityLabel: string; label: string };

function projectButtonLabels(
  project: StartSessionLayout['props']['projects'][number] | undefined,
): ProjectButtonLabels {
  if (!project)
    return { accessibilityLabel: 'Project: None', label: 'Choose a Project' };

  return {
    accessibilityLabel: `Project: ${project.name}`,
    label: project.name,
  };
}

function projectContents(
  layout: StartSessionLayout,
  close: () => void,
): React.JSX.Element {
  return (
    <Combobox.Content
      label="Projects"
      value={layout.props.projectId}
      searchPlaceholder="Find a Project…"
      emptyLabel="No Project matches."
      options={projectOptions(layout.props.projects)}
      onValueChange={(id) => selectProject(layout, close, id)}
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
