import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type { IconName } from '@repo/kit/symbols/icon-names';
import type * as React from 'react';
import type { ProjectHeadingProps } from './project-heading';

interface ProjectActionButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
}

type ProjectActionsProps = Pick<
  ProjectHeadingProps,
  'name' | 'onAdd' | 'addLabel' | 'onProjectSettings'
>;

// + adds to the Project and ⋯ opens its settings, in the section header's order.
function actionButtons({
  name,
  onAdd,
  addLabel = `Add to ${name}`,
  onProjectSettings,
}: ProjectActionsProps): ProjectActionButtonProps[] {
  return [
    { icon: 'add', accessibilityLabel: addLabel, onPress: onAdd },
    {
      icon: 'more',
      accessibilityLabel: `Project settings for ${name}`,
      onPress: onProjectSettings,
    },
  ];
}

function ProjectAction(props: ProjectActionButtonProps): React.JSX.Element {
  return (
    <IconButton
      {...props}
      variant="ghost"
      size="xs"
      disabled={!props.onPress}
    />
  );
}

export function ProjectActions(props: ProjectActionsProps): React.JSX.Element {
  return (
    <>
      {actionButtons(props).map((button) => (
        <ProjectAction key={button.icon} {...button} />
      ))}
    </>
  );
}
