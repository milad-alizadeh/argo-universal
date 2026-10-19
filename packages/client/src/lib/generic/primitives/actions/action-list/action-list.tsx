import { useMemo, type ReactElement } from 'react';
import { View } from 'react-native';
import {
  ActionSection,
  actionGroups,
  orderedGroups,
  type ActionGroup,
  type DeclaredAction,
} from './action-declarations';
import { ActionListBody } from './action-list-body';
import type { ActionListProps } from './action-list-props';
import { useActionShortcuts } from './action-shortcut-scope';

function ActionListRoot(props: ActionListProps): ReactElement | null {
  const { groups, id, actions } = useDeclaredActions(props);

  if (!actions.length) return props.trigger ?? null;

  return (
    <View nativeID={id}>
      <ActionListBody {...props} groups={hintedGroups(groups, actions)} />
    </View>
  );
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
