import type * as React from 'react';
import { cn } from '#lib/generic/utils';
import { Button } from '#primitives/buttons/button';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { ProjectPicker } from './project-picker';
import { SessionControlDisclosure } from './session-control-disclosure';
import type { StartSessionLayout } from './start-session-types';

export function SessionProjectControl(
  layout: StartSessionLayout,
): React.JSX.Element {
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

function projectTrigger(layout: StartSessionLayout): React.JSX.Element {
  return <Button {...projectButtonProps(layout)} />;
}

const projectButtonAppearance = {
  appearance: 'content',
  variant: 'ghost',
  labelNumberOfLines: 1,
  icon: 'folder',
  labelClassName: 'shrink',
  trailing: <SessionControlDisclosure />,
} as const;

function projectButtonProps({
  props,
  wide,
}: StartSessionLayout): React.ComponentProps<typeof Button> {
  const project = props.projects.find((entry) => entry.id === props.projectId);

  return {
    ...projectButtonLabels(project),
    ...projectButtonAppearance,
    disabled: props.disabled,
    className: cn(
      'gap-1.5 justify-start',
      wide ? 'h-7 sm:h-7 px-1.5 py-0' : 'h-10 sm:h-10 px-4',
    ),
  };
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
    <ProjectPicker
      projects={layout.props.projects}
      projectId={layout.props.projectId}
      onSelect={(id) => selectProject(layout, close, id)}
    />
  );
}
