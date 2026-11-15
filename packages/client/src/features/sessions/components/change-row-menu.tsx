import {
  ContextMenu,
  type ContextMenuItem,
  Menu,
  type MenuAction,
  MenuTrigger,
} from '@repo/kit/primitives/overlays/menu';
import { contextMenuGroup } from '@repo/kit/primitives/overlays/menu';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { ChangeRowProps } from './change-row';

type MenuProps = Pick<
  ChangeRowProps,
  'change' | 'onOpen' | 'onCopyLink' | 'onDetach'
>;

const openLabel = 'Open on GitHub';

const copyLabel = 'Copy link';

const detachLabel = 'Detach from Session';

// The groups of the row's menu: Open on GitHub and Copy link, then Detach from Session. An item with no handler is left out.
function groupsOf(props: MenuProps): ContextMenuItem[][] {
  return [
    [
      { label: openLabel, onPress: props.onOpen },
      ...contextMenuGroup({ label: copyLabel }, props.onCopyLink),
    ],
    contextMenuGroup({ label: detachLabel }, props.onDetach),
  ].filter((group) => group.length > 0);
}

// The Menu's entries are the same groups as one list, each later group starting a section.
const actionsOf = (groups: ContextMenuItem[][]): MenuAction[] =>
  groups.flatMap((group, index) =>
    group.map(({ label, onPress }, place) => ({
      label,
      onPress,
      ...(index > 0 && place === 0 && { section: {} }),
    })),
  );

// The row's …, which sits above its press layer.
export function ChangeMenu(props: MenuProps): ReactElement {
  return (
    <View className="relative z-10 shrink-0">
      <Menu
        accessibilityLabel={`Actions for Change #${props.change.number}`}
        align="end"
        trigger={<MenuTrigger label="Actions" icon="more" iconOnly />}
        actions={actionsOf(groupsOf(props))}
      />
    </View>
  );
}

// A long press on the row opens the same menu where the system draws it.
export function ChangeContextMenu(
  props: MenuProps & { children: ReactElement },
): ReactElement {
  return <ContextMenu groups={groupsOf(props)}>{props.children}</ContextMenu>;
}
