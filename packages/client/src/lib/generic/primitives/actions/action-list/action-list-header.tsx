import type { ReactElement } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Menu, type MenuAction } from '#primitives/overlays/menu';
import type { ActionGroup, DeclaredAction } from './action-declarations';

interface HeaderProps {
  groups: ActionGroup[];
  label: string;
}

interface OverflowProps {
  actions: MenuAction[];
  label: string;
}

export function HeaderActions({ groups, label }: HeaderProps): ReactElement {
  const direct = directActions(groups);
  const overflow = overflowActions(groups, direct);

  return (
    <View className="flex-row items-center gap-1">
      {direct.map((action) => (
        <HeaderAction key={action.id} action={action} />
      ))}
      <Overflow actions={overflow} label={label} />
    </View>
  );
}

function overflowActions(
  groups: ActionGroup[],
  direct: DeclaredAction[],
): MenuAction[] {
  return groups.flatMap((group) =>
    group.actions
      .filter((action) => !direct.includes(action))
      .map((action, index) => ({
        ...action,
        section: index === 0 ? { title: group.title } : undefined,
      })),
  );
}

function Overflow({ actions, label }: OverflowProps): ReactElement | null {
  if (!actions.length) return null;

  return (
    <Menu
      accessibilityLabel={label}
      trigger={overflowTrigger(label)}
      actions={actions}
    />
  );
}

// A header button is an icon, so only an Action with one becomes a button.
type IconAction = DeclaredAction & {
  icon: NonNullable<DeclaredAction['icon']>;
};

const hasIcon = (action: DeclaredAction): action is IconAction =>
  action.icon !== undefined;

function HeaderAction({ action }: { action: IconAction }): ReactElement {
  return (
    <IconButton
      icon={action.icon}
      iconRole="action"
      accessibilityLabel={action.label}
      disabled={action.disabled}
      onPress={action.onPress}
      variant="ghost"
    />
  );
}

function directActions(groups: ActionGroup[]): IconAction[] {
  return groups
    .flatMap((group) => group.actions)
    .filter((action) => action.tone !== 'danger')
    .filter(hasIcon)
    .slice(0, 2);
}

function overflowTrigger(label: string): ReactElement {
  return (
    <IconButton
      icon={{ sf: 'ellipsis', material: 'more_vert' }}
      iconRole="action"
      accessibilityLabel={label}
      variant="ghost"
    />
  );
}
