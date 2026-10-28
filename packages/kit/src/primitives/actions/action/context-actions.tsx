import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { ContextMenu, type ContextMenuProps } from '#primitives/overlays/menu';
import { pressGroups } from './action-declarations';
import { useDeclaredActions } from './declared-actions';

// Kit-only: what the system menu shows around its Actions.
export type ContextMenuMeta = Pick<
  ContextMenuProps,
  'title' | 'preview' | 'onDoubleClick'
>;

export interface ContextActionsProps {
  // A component's `actions` Slot: Actions and Sections, offered as one context menu.
  actions?: ReactNode;
  // Kit-only: Actions Argo adds after them, such as a List row's Move Section. They claim their shortcuts as Argo's own, in a Plugin's tree too.
  builtIn?: ReactNode;
  // Kit-only: the menu's meta, with the element's name.
  menu?: ContextMenuMeta & Pick<ContextMenuProps, 'spoken'>;
  // What the context menu opens on.
  children: ContextMenuProps['children'];
}

/*
 * Opens the Actions on right-click and long press, and runs their shortcuts while focus is inside the trigger; with no
 * Actions, the trigger draws alone. A context menu is one level on every platform, so it lists press Actions only and
 * leaves submenus out. The owner's Actions and Argo's are declared apart, each claiming shortcuts as its own.
 */
export function ContextActions(props: ContextActionsProps): ReactElement {
  const own = useDeclaredActions(props.actions, true);
  const added = useDeclaredActions(props.builtIn, true, true);
  const groups = pressGroups([...own.groups, ...added.groups]);

  // Actions that are all submenus leave a context menu with nothing to show, so it never opens.
  if (!groups.length) return props.children;

  return (
    <AnchoredMenu
      {...props}
      ownId={own.id}
      addedId={added.id}
      groups={groups}
    />
  );
}

interface AnchoredMenuProps extends ContextActionsProps {
  // The node the owner's Actions' shortcuts run inside.
  ownId: string;
  // The node Argo's own Actions' shortcuts run inside.
  addedId: string;
  groups: ReturnType<typeof pressGroups>;
}

function AnchoredMenu(props: AnchoredMenuProps): ReactElement {
  return (
    <View nativeID={props.ownId}>
      <View nativeID={props.addedId}>
        <ContextMenu {...props.menu} {...menuGroups(props.groups)}>
          {props.children}
        </ContextMenu>
      </View>
    </View>
  );
}

const menuGroups = (
  groups: ReturnType<typeof pressGroups>,
): Pick<ContextMenuProps, 'groups' | 'groupTitles'> => ({
  groups: groups.map((group) => group.actions),
  groupTitles: groups.map((group) => group.title),
});
