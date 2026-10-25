import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { ContextMenu, type ContextMenuProps } from '#primitives/overlays/menu';
import { pressGroups } from './action-declarations';
import { useDeclaredActions, type DeclaredActions } from './declared-actions';

// Kit-only: what the system menu shows around its Actions.
export type ContextMenuMeta = Pick<
  ContextMenuProps,
  'title' | 'preview' | 'onDoubleClick'
>;

export interface ContextActionsProps {
  // A component's `actions` Slot: Actions and Sections, offered as one context menu.
  actions?: ReactNode;
  menu?: ContextMenuMeta;
  // What the context menu opens on.
  children: ContextMenuProps['children'];
}

/*
 * Opens the Actions on right-click and long press, and runs their shortcuts while focus is inside the trigger; with no
 * Actions, the trigger draws alone. A context menu is one level on every platform, so it lists press Actions only and
 * leaves submenus out.
 */
export function ContextActions(props: ContextActionsProps): ReactElement {
  const declared = useDeclaredActions(props.actions, true);
  const groups = pressGroups(declared.groups);

  // Actions that are all submenus leave a context menu with nothing to show, so it never opens.
  if (!groups.length) return props.children;

  return <AnchoredMenu {...props} declared={declared} groups={groups} />;
}

function AnchoredMenu(
  props: ContextActionsProps & {
    declared: DeclaredActions;
    groups: ReturnType<typeof pressGroups>;
  },
): ReactElement {
  const { groups } = props;

  return (
    <View nativeID={props.declared.id}>
      <ContextMenu {...props.menu} {...menuGroups(groups)}>
        {props.children}
      </ContextMenu>
    </View>
  );
}

const menuGroups = (
  groups: ReturnType<typeof pressGroups>,
): Pick<ContextMenuProps, 'groups' | 'groupTitles'> => ({
  groups: groups.map((group) => group.actions),
  groupTitles: groups.map((group) => group.title),
});
