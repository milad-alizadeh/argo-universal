import type * as React from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import type { MergeMethod } from '../stores/merge-method';
import { MergePrButton, type MergePrButtonProps } from './merge-pr-button';
import {
  headerActionAppearance,
  SessionHeaderMenu,
} from './session-header-menu';
import type { SessionHeaderProps } from './session-header-props';
import type { SessionMenu } from './session-menu-items';
import type { SessionPullRequest } from './session-pull-request';

export type SessionHeaderActionsProps = Pick<
  MergePrButtonProps,
  'method' | 'onMethodChange'
> & {
  shown: SessionPullRequest | undefined;
  onMerge: SessionHeaderProps['onMerge'];
  menu?: SessionMenu;
  changes?: SessionHeaderProps['changes'];
};

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
  const { shown, method, onMethodChange } = props;

  if (!shown) return null;

  return (
    <MergePrButton
      {...{ method, onMethodChange }}
      mergeable={shown.mergeable}
      onMerge={mergeShown({ ...props, shown })}
    />
  );
}

type InspectorToggle = Pick<
  React.ComponentProps<typeof IconButton>,
  'aria-expanded' | 'onPress'
>;

function inspectorToggle(
  changes: SessionHeaderProps['changes'],
): InspectorToggle {
  if (!changes) return { 'aria-expanded': false };

  return {
    'aria-expanded': changes.open,
    onPress: () => changes.onOpenChange(!changes.open),
  };
}

function ChangesButton({
  changes,
}: Pick<SessionHeaderActionsProps, 'changes'>): React.JSX.Element {
  return (
    <IconButton
      {...headerActionAppearance}
      accessibilityLabel="Changes"
      {...inspectorToggle(changes)}
      icon="diff"
    />
  );
}

// Merge PR for the shown PR, Changes, and the Session menu.
export function SessionHeaderActions(
  props: SessionHeaderActionsProps,
): React.JSX.Element {
  return (
    <View className="-mt-1 flex-row items-center gap-3">
      <ShownMergeButton {...props} />
      <ChangesButton changes={props.changes} />
      {props.menu && <SessionHeaderMenu menu={props.menu} />}
    </View>
  );
}
