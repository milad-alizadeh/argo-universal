import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { iconNames } from '../../../symbols/icon-names';
import type { IconName } from '../../../symbols/icon-names';
import type { EmptyStateProps } from './empty-state-props';

/*
 * Centred as a column. The action sits in a box of its own size that the column centres: Expo's web Host, which
 * holds a Button, pins itself to the start of whatever holds it.
 */
export function EmptyState(props: EmptyStateProps): React.JSX.Element {
  return (
    <View
      testID={props.testID}
      className="min-h-50 flex-1 flex-col items-center justify-center gap-4 p-6 text-center"
    >
      {props.icon && <EmptyStateIcon icon={props.icon} />}
      <EmptyStateText {...props} />
      {props.action && <View className="self-center">{props.action}</View>}
    </View>
  );
}

function EmptyStateText({
  title,
  description,
}: Pick<EmptyStateProps, 'title' | 'description'>): React.JSX.Element {
  return (
    <View className="items-center gap-1">
      <EmptyStateTitle title={title} />
      {description && <EmptyStateDescription description={description} />}
    </View>
  );
}

function EmptyStateTitle({
  title,
}: Pick<EmptyStateProps, 'title'>): React.JSX.Element {
  return (
    <Text
      accessibilityRole="heading"
      aria-level={2}
      role="title"
      className="text-center"
    >
      {title}
    </Text>
  );
}

function EmptyStateDescription({
  description,
}: Required<Pick<EmptyStateProps, 'description'>>): React.JSX.Element {
  return (
    <Text role="body" tone="muted" className="text-center">
      {description}
    </Text>
  );
}

function EmptyStateIcon({ icon }: { icon: string }): React.JSX.Element | null {
  const iconName = iconNames.find((name) => name === icon);

  if (!iconName) return null;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="relative h-18 w-22 shrink-0 overflow-visible"
    >
      <DecorativeTiles />
      <IconTile icon={iconName} />
    </View>
  );
}

function DecorativeTiles(): React.JSX.Element {
  return (
    <>
      <View
        className="absolute left-1.5 top-3.5 size-12 rounded-xl bg-card opacity-60 shadow-control"
        style={firstTileRotation}
      />
      <View
        className="absolute top-3.5 size-12 rounded-xl bg-card opacity-60 shadow-control"
        style={secondTilePosition}
      />
    </>
  );
}

const firstTileRotation = {
  transform: [{ rotate: '-12deg' }],
  transformOrigin: '0% 0%',
} as const;

const secondTilePosition = {
  left: 34,
  transform: [{ rotate: '12deg' }],
  transformOrigin: '0% 0%',
} as const;

function IconTile({ icon }: { icon: IconName }): React.JSX.Element {
  return (
    <View className="absolute left-5 top-2 size-12 items-center justify-center rounded-xl bg-card shadow-empty-state-tile">
      <Icon name={icon} size="lg" />
    </View>
  );
}
