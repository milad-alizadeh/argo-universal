import type * as React from 'react';
import { View } from 'react-native';
import { useInspector } from '#lib/product/inspector';
import { IconButton } from '#primitives/buttons/icon-button';
import { type MergeMethod, MergePrButton } from './merge-pr-button';
import type { SessionHeaderProps } from './session-header-props';
import type { SessionPullRequest } from './session-pull-request';

interface SessionHeaderActionsProps {
  shown: SessionPullRequest | undefined;
  onMerge: SessionHeaderProps['onMerge'];
}

function mergeShown({
  shown,
  onMerge,
}: SessionHeaderActionsProps & { shown: SessionPullRequest }):
  | ((method: MergeMethod) => void)
  | undefined {
  return onMerge && ((method) => onMerge(shown.number, method));
}

function ShownMergeButton(
  props: SessionHeaderActionsProps,
): React.JSX.Element | null {
  const { shown } = props;

  if (!shown) return null;

  return (
    <MergePrButton
      mergeable={shown.mergeable}
      onMerge={mergeShown({ ...props, shown })}
    />
  );
}

const headerActionAppearance = {
  variant: 'ghost',
  size: 'sm',
  iconRole: 'action',
  iconClassName: 'text-foreground',
} as const;

type InspectorToggle = Pick<
  React.ComponentProps<typeof IconButton>,
  'aria-expanded' | 'onPress'
>;

function inspectorToggle(
  inspector: ReturnType<typeof useInspector>,
): InspectorToggle {
  if (!inspector) return { 'aria-expanded': false };

  return { 'aria-expanded': inspector.open, onPress: inspector.toggle };
}

function ChangesButton(): React.JSX.Element {
  return (
    <IconButton
      {...headerActionAppearance}
      accessibilityLabel="Changes"
      {...inspectorToggle(useInspector())}
      icon="diff"
      className="bg-foreground/7"
    />
  );
}

// The Session menu gets its actions in a later issue.
const sessionMenuButton = (
  <IconButton
    {...headerActionAppearance}
    accessibilityLabel="More"
    icon="more"
  />
);

// Merge PR for the shown PR, Changes, and the Session menu.
export function SessionHeaderActions(
  props: SessionHeaderActionsProps,
): React.JSX.Element {
  return (
    <View className="-mt-1 flex-row items-center gap-3">
      <ShownMergeButton {...props} />
      <ChangesButton />
      {sessionMenuButton}
    </View>
  );
}
