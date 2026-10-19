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
    id: declared.id,
    groups: declared.hinted,
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

  const body = <ActionListBody {...{ ...props, groups: declared.hinted }} />;

  return <View nativeID={declared.id}>{body}</View>;
}

interface DeclaredActions {
  hinted: ActionGroup[];
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

  const owned = ownedShortcuts(actions);
  const hinted = useMemo(() => hintedGroups(groups, owned), [groups, owned]);

  return { hinted, id, actions };
}

// A string, so the groups (and the header registration) only change when the shortcuts this list owns do.
function ownedShortcuts(actions: DeclaredAction[]): string {
  return actions
    .flatMap((action) => (action.shortcut ? [action.id] : []))
    .join(' ');
}

function hintedGroups(groups: ActionGroup[], owned: string): ActionGroup[] {
  const shortcuts = new Set(owned.split(' '));

  return orderedGroups(
    groups.map((group) => ({
      ...group,
      actions: group.actions.map((action) =>
        shortcuts.has(action.id) ? action : { ...action, shortcut: undefined },
      ),
    })),
  );
}

export const ActionList = Object.assign(ActionListRoot, {
  Section: ActionSection,
});
