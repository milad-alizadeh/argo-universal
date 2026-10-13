import type * as React from 'react';
import { View } from 'react-native';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { cn } from '#lib/generic/utils';
import { IconButton } from '#primitives/buttons/icon-button/icon-button';
import type { InteractionEvents, ProjectHeadingProps } from './project-heading';

const actionAppearance = {
  variant: 'ghost',
  className: 'size-6 sm:size-6 rounded-sm p-0 web:has-[>[data-icon]]:px-0',
  iconClassName: 'text-foreground',
  size: 'md',
} as const;

interface ProjectActionButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  events: InteractionEvents;
}

function ProjectActionButton({
  onPress,
  events,
  ...button
}: ProjectActionButtonProps): React.JSX.Element {
  return (
    <IconButton
      {...actionAppearance}
      {...button}
      onPress={onPress}
      disabled={!onPress}
      {...events}
    />
  );
}

interface ProjectActionsProps extends Pick<
  ProjectHeadingProps,
  'name' | 'onAdd' | 'addLabel' | 'onProjectSettings'
> {
  visible: boolean;
  events: InteractionEvents;
}

function actionButtons({
  name,
  onAdd,
  addLabel = `Add to ${name}`,
  onProjectSettings,
}: ProjectActionsProps): Omit<ProjectActionButtonProps, 'events'>[] {
  return [
    {
      icon: 'more',
      accessibilityLabel: `Project settings for ${name}`,
      onPress: onProjectSettings,
    },
    { icon: 'add', accessibilityLabel: addLabel, onPress: onAdd },
  ];
}

function actionsClassName(visible: boolean): string {
  return cn('flex-row items-center gap-0.5', !visible && 'opacity-0');
}

// ⋯ opens the Project's settings and + adds to it; both fade out until wanted.
export function ProjectActions(props: ProjectActionsProps): React.JSX.Element {
  return (
    <View className={actionsClassName(props.visible)}>
      {actionButtons(props).map((button) => (
        <ProjectActionButton
          key={button.icon}
          {...button}
          events={props.events}
        />
      ))}
    </View>
  );
}
