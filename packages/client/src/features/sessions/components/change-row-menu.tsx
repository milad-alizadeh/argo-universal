import {
  ContextMenu,
  type ContextMenuItem,
  Menu,
  type MenuAction,
  MenuTrigger,
} from '@repo/kit/primitives/overlays/menu';
import { contextMenuGroup } from '@repo/kit/primitives/overlays/menu';
import type { ChangeAutomationKind } from '@repo/contracts';
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

// The automations in the order the design draws them, with the words core gives each.
const automations = [
  { kind: 'fix', label: 'Auto-fix' },
  { kind: 'merge', label: 'Auto-merge' },
  { kind: 'archive', label: 'Auto-archive', subtitle: 'On merge or close' },
] as const satisfies readonly {
  kind: ChangeAutomationKind;
  label: string;
  subtitle?: string;
}[];

/*
 * The automation items: a checkmark item for each the Plugin offers that works, or that says why it does not. One it
 * offers neither way is left out, as is the whole group when the Change carries none or nothing can set them.
 */
function automationItems({
  change,
  onSetAutomation,
}: MenuProps): ContextMenuItem[] {
  const { automation } = change;

  if (!automation || !onSetAutomation) return [];

  return automations.flatMap(({ kind, label, ...fixed }) => {
    const { on, available, reason } = automation[kind];

    if (!available && !reason) return [];

    const subtitle = reason ?? ('subtitle' in fixed ? fixed.subtitle : undefined);

    return [
      {
        id: `automation-${kind}`,
        label,
        selected: on,
        disabled: !available,
        ...(subtitle && { subtitle }),
        // A reason on an item that can be used says it stopped itself, which the design draws in the warning tone.
        ...(available && reason && { subtitleTone: 'warning' as const }),
        onPress: () => onSetAutomation(kind, !on),
      },
    ];
  });
}

// The groups of the row's menu: Open on GitHub and Copy link, the automations, then Detach from Session. An item with no handler is left out.
function groupsOf(props: MenuProps): ContextMenuItem[][] {
  return [
    [
      { label: openLabel, onPress: props.onOpen },
      ...contextMenuGroup({ label: copyLabel }, props.onCopyLink),
    ],
    automationItems(props),
    contextMenuGroup({ label: detachLabel }, props.onDetach),
  ].filter((group) => group.length > 0);
}

// The Menu's entries are the same groups as one list, each later group starting a section.
const actionsOf = (groups: ContextMenuItem[][]): MenuAction[] =>
  groups.flatMap((group, index) =>
    group.map(({ label, onPress, id, selected, disabled, subtitle, subtitleTone }, place) => ({
      label,
      onPress,
      ...(id && { id }),
      ...(selected !== undefined && { selected }),
      ...(disabled && { disabled }),
      ...(subtitle && { subtitle }),
      ...(subtitleTone && { subtitleTone }),
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
