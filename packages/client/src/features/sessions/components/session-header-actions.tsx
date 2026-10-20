import type * as React from 'react';
import { View } from 'react-native';
import type { MergeMethod } from '../stores/merge-method';
import { MergePrButton, type MergePrButtonProps } from './merge-pr-button';
import { SessionHeaderMenu } from './session-header-menu';
import type { SessionHeaderProps } from './session-header-props';
import type { SessionMenu } from './session-menu-items';
import { SessionPanelTriggers } from './session-panel-triggers';
import type { SessionPullRequest } from './session-pull-request';

export type SessionHeaderActionsProps = Pick<
  MergePrButtonProps,
  'method' | 'onMethodChange'
> & {
  shown: SessionPullRequest | undefined;
  onMerge: SessionHeaderProps['onMerge'];
  menu?: SessionMenu;
  panels?: SessionHeaderProps['panels'];
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

// Merge PR for the shown PR, the Inspector's panel triggers, and the Session menu.
export function SessionHeaderActions(
  props: SessionHeaderActionsProps,
): React.JSX.Element {
  return (
    <View className="-mt-1 flex-row items-center gap-3">
      <ShownMergeButton {...props} />
      <SessionPanelTriggers panels={props.panels} />
      {props.menu && <SessionHeaderMenu menu={props.menu} />}
    </View>
  );
}
