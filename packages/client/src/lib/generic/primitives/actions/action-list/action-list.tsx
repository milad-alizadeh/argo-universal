import { useMemo, type ReactElement } from 'react';
import { View } from 'react-native';
import {
  ActionSection,
  actionGroups,
  orderedGroups,
  type ActionGroup,
  type DeclaredAction,
} from './action-declarations';
import { useHeaderRegistration } from './action-header-context';
import { ActionListBody } from './action-list-body';
import type { ActionListProps } from './action-list-props';
import { useActionShortcuts } from './action-shortcut-scope';

function ActionListRoot(props: ActionListProps): ReactElement | null {
  const declared = useDeclaredActions(props);

  const header = useHeaderRegistration({
    ...declared,
    label: props.accessibilityLabel,
    context: props.variant === 'context',
  });

  return header ? null : (
    <DeclaredActionsBody props={props} declared={declared} />
  );
}

function DeclaredActionsBody({
  props,
  declared,
}: {
  props: ActionListProps;
  declared: DeclaredActions;
}): ReactElement | null {
  if (!declared.actions.length) return props.trigger ?? null;

  const body = (
    <ActionListBody
      {...{ ...props, groups: hintedGroups(declared.groups, declared.actions) }}
    />
  );

  return <View nativeID={declared.id}>{body}</View>;
}

interface DeclaredActions {
  groups: ActionGroup[];
  id: string;
  actions: DeclaredAction[];
}

function useDeclaredActions(props: ActionListProps): DeclaredActions {
  const groups = useMemo(() => actionGroups(props.children), [props.children]);

  const declarations = useMemo(
    () => groups.flatMap((group) => group.actions),
    [groups],
  );

  const { id, actions } = useActionShortcuts({
    actions: declarations,
    plugin: Boolean(props.plugin),
    context: props.variant === 'context',
  });

  return { groups, id, actions };
}

function hintedGroups(
  groups: ActionGroup[],
  actions: DeclaredAction[],
): ActionGroup[] {
  const hints = new Map(actions.map((action) => [action.id, action]));

  return orderedGroups(
    groups.map((group) => ({
      ...group,
      actions: group.actions.map((action) => hints.get(action.id) ?? action),
    })),
  );
}

export const ActionList = Object.assign(ActionListRoot, {
  Section: ActionSection,
});
