import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { cn } from '#lib/generic/utils';
import { Button } from '#primitives/buttons/button';
import {
  Combobox,
  type ComboboxProps,
  type PickerOption,
} from '#primitives/inputs/picker';
import { SessionControlDisclosure } from './session-control-disclosure';
import type { StartSessionLayout } from './start-session-types';

export function SessionProjectControl(
  layout: StartSessionLayout,
): React.JSX.Element {
  return <Combobox {...projectComboboxProps(layout)} />;
}

const projectSearch = {
  label: 'Project',
  searchPlaceholder: 'Find a Project…',
  emptyLabel: 'No Project matches.',
};

function projectComboboxProps(
  layout: StartSessionLayout,
): ComboboxProps<string> {
  const { props } = layout;

  return {
    ...projectSearch,
    value: props.projectId,
    options: props.projects.map(projectOption),
    onValueChange: (id) => {
      if (id !== props.projectId) props.onProjectChange(id);
    },
    disabled: props.disabled,
    trigger: projectTrigger(layout),
  };
}

function projectOption(project: ProjectInfo): PickerOption<string> {
  return {
    value: project.id,
    label: project.name,
    supporting: project.path,
    supportingCode: true,
    icon: 'folder',
  };
}

function projectTrigger(layout: StartSessionLayout): React.JSX.Element {
  return <Button {...projectButtonProps(layout)} />;
}

const projectButtonAppearance = {
  custom: true,
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
