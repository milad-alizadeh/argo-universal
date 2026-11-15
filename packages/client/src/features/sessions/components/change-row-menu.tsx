import type { ChangeAutomationKind } from '@repo/contracts';
import {
  ContextMenu,
  type ContextMenuItem,
  type ContextMenuTriggerProps,
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
  'change' | 'onOpen' | 'onCopyLink' | 'onDetach' | 'onSetAutomation'
>;

const openLabel = 'Open on GitHub';

const copyLabel = 'Copy link';

const detachLabel = 'Detach from Session';

const openItem = (onPress: () => void): ContextMenuItem => ({
  label: openLabel,
  icon: 'external-link',
  onPress,
});

type Automation = NonNullable<MenuProps['change']['automation']>;

type AutomationEntry = {
  kind: ChangeAutomationKind;
  label: string;
  icon: NonNullable<ContextMenuItem['icon']>;
  subtitle?: string;
};

// The automations in the order the design draws them, with the words core gives each.
const automations: readonly AutomationEntry[] = [
  { kind: 'fix', label: 'Auto-fix', icon: 'tool' },
  { kind: 'merge', label: 'Auto-merge', icon: 'merged' },
  {
    kind: 'archive',
    label: 'Auto-archive',
    icon: 'archive',
    subtitle: 'On merge or close',
  },
];

// One the Plugin offers works, or says why it does not; any other is left out.
const isOffered = ({
  available,
  reason,
}: Automation[ChangeAutomationKind]): boolean => available || Boolean(reason);

const subtitled = (subtitle?: string): Pick<ContextMenuItem, 'subtitle'> =>
  subtitle ? { subtitle } : {};

function automationItem(
  { kind, label, icon, subtitle: fixed }: AutomationEntry,
  { on, available, reason }: Automation[ChangeAutomationKind],
  onSetAutomation: NonNullable<MenuProps['onSetAutomation']>,
): ContextMenuItem {
  return {
    id: `automation-${kind}`,
    label,
    icon,
    selected: on,
    disabled: !available,
    ...subtitled(reason ?? fixed),
    onPress: () => onSetAutomation(kind, !on),
  };
}

/*
 * The automation items: a checkmark item for each the Plugin offers that works, or that says why it does not. One it
 * offers neither way is left out, as is the whole group when the Change carries none or nothing can set them.
 */
function automationItems({
  change: { automation },
  onSetAutomation,
}: MenuProps): ContextMenuItem[] {
  if (!automation || !onSetAutomation) return [];

  return automations.flatMap((entry) =>
    isOffered(automation[entry.kind])
      ? [automationItem(entry, automation[entry.kind], onSetAutomation)]
      : [],
  );
}

// The groups of the row's menu: Open on GitHub and Copy link, the automations, then Detach from Session. An item with no handler is left out.
function groupsOf(props: MenuProps): ContextMenuItem[][] {
  return [
    [
      openItem(props.onOpen),
      ...contextMenuGroup({ label: copyLabel, icon: 'copy' }, props.onCopyLink),
    ],
    automationItems(props),
    contextMenuGroup({ label: detachLabel, icon: 'close' }, props.onDetach),
  ].filter((group) => group.length > 0);
}

const labelsOf = ({
  id,
  subtitle,
}: ContextMenuItem): Pick<MenuAction, 'id' | 'subtitle'> => ({
  ...(id && { id }),
  ...(subtitle && { subtitle }),
});

const iconOf = ({ icon }: ContextMenuItem): Pick<MenuAction, 'icon'> =>
  icon ? { icon } : {};

const flagsOf = ({
  selected,
  disabled,
}: ContextMenuItem): Pick<MenuAction, 'selected' | 'disabled'> => ({
  ...(selected !== undefined && { selected }),
  ...(disabled && { disabled }),
});

const actionOf = (
  item: ContextMenuItem,
  startsSection: boolean,
): MenuAction => ({
  label: item.label,
  onPress: item.onPress,
  ...labelsOf(item),
  ...iconOf(item),
  ...flagsOf(item),
  ...(startsSection && { section: {} }),
});

// The Menu's entries are the same groups as one list, each later group starting a section.
const actionsOf = (groups: ContextMenuItem[][]): MenuAction[] =>
  groups.flatMap((group, index) =>
    group.map((item, place) => actionOf(item, index > 0 && place === 0)),
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
  props: MenuProps & { children: ReactElement<ContextMenuTriggerProps> },
): ReactElement {
  return <ContextMenu groups={groupsOf(props)}>{props.children}</ContextMenu>;
}
