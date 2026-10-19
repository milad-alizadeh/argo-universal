import type * as React from 'react';
import { View } from 'react-native';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { IconButton } from '#primitives/actions/icon-button';
import type { ProjectHeadingProps } from './project-heading';

// Each button reveals itself on row hover or its own keyboard focus; a click that leaves focus behind does not hold it.
const revealClassName =
  'web:wide:opacity-0 web:wide:group-hover:opacity-100 web:wide:focus-visible:opacity-100';

const actionAppearance = {
  variant: 'ghost',
  className: `size-6 sm:size-6 rounded-sm p-0 ${revealClassName}`,
  iconClassName: 'text-foreground',
  size: 'sm',
} as const;

interface ProjectActionButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
}

function ProjectActionButton({
  onPress,
  ...button
}: ProjectActionButtonProps): React.JSX.Element {
  return (
    <IconButton
      {...actionAppearance}
      {...button}
      onPress={onPress}
      disabled={!onPress}
    />
  );
}

type ProjectActionsProps = Pick<
  ProjectHeadingProps,
  'name' | 'onAdd' | 'addLabel' | 'onProjectSettings'
>;

function actionButtons({
  name,
  onAdd,
  addLabel = `Add to ${name}`,
  onProjectSettings,
}: ProjectActionsProps): ProjectActionButtonProps[] {
  return [
    {
      icon: 'more',
      accessibilityLabel: `Project settings for ${name}`,
      onPress: onProjectSettings,
    },
    { icon: 'add', accessibilityLabel: addLabel, onPress: onAdd },
  ];
}

// A wide web window shows ⋯ and + on hover or keyboard focus, never after a click leaves focus behind.
const actionsClassName = 'flex-row items-center gap-0.5';

// ⋯ opens the Project's settings and + adds to it; both wait for hover or focus on a wide window.
export function ProjectActions(props: ProjectActionsProps): React.JSX.Element {
  return (
    <View className={actionsClassName}>
      {actionButtons(props).map((button) => (
        <ProjectActionButton key={button.icon} {...button} />
      ))}
    </View>
  );
}
