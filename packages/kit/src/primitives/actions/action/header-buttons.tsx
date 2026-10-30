import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  IconButton,
  type IconButtonSize,
} from '#primitives/actions/icon-button';
import {
  submenuGroups,
  isSubmenu,
  type ActionGroup,
  type DeclaredSubmenu,
} from './action-declarations';
import {
  splitHeaderActions,
  type HeaderActionSplit,
  type HeaderEntry,
  type IconAction,
} from './header-actions';
import { HeaderButtonTooltip } from './header-button-tooltip';
import { ActionMenu, overflowIcon } from './header-menu';
import { HeaderTrigger } from './header-trigger';
import { submenuLabel } from './submenu-badge';

// How a header draws its buttons: their size, and what each one's spoken name says it acts on.
export interface HeaderButtonLook {
  // A list column's heading and a section's header draw smaller buttons than a page's.
  size?: IconButtonSize;
  /*
   * The name of what the Actions act on, such as a section's title, spoken after each button's label so repeated
   * headers keep distinct names; the visible label and the menus keep the label alone.
   */
  subject?: string;
}

export interface HeaderActionsProps {
  // Ordered by `orderedGroups`.
  groups: ActionGroup[];
  label: string;
  // How many controls the header has room for, the overflow button included.
  slots: number;
  look?: HeaderButtonLook;
}

interface LookProps {
  look: HeaderButtonLook;
}

// A header's Actions as Argo-drawn buttons and menus where Argo draws the heading; a phone's native header uses stock items.
export function HeaderActions(props: HeaderActionsProps): ReactElement {
  const split = splitHeaderActions(props.groups, props.slots);

  return <HeaderButtons {...split} label={props.label} look={props.look} />;
}

type HeaderButtonsProps = HeaderActionSplit &
  Pick<HeaderActionsProps, 'label' | 'look'>;

// Actions already split for the header's room, as a Screen's header holds them.
export function HeaderButtons(props: HeaderButtonsProps): ReactElement {
  const look = props.look ?? {};

  return (
    <View className="flex-row items-center gap-1">
      {props.direct.map((entry) => headerEntry(entry, look))}
      <HeaderOverflow groups={props.overflow} label={props.label} look={look} />
    </View>
  );
}

function headerEntry(entry: HeaderEntry, look: HeaderButtonLook): ReactElement {
  if (isSubmenu(entry))
    return <HeaderSubmenu key={entry.id} submenu={entry} look={look} />;

  return <HeaderAction key={entry.id} action={entry} look={look} />;
}

// A button's spoken name: its label, then its subject when it has one.
const spokenLabel = (label: string, { subject }: HeaderButtonLook): string =>
  subject ? `${label}, ${subject}` : label;

function HeaderOverflow(
  props: LookProps & { groups: ActionGroup[]; label: string },
): ReactElement | null {
  if (!props.groups.length) return null;

  const { label, look } = props;

  const trigger = (
    <HeaderTrigger
      icon={overflowIcon}
      label={spokenLabel(label, look)}
      size={look.size}
    />
  );

  return <ActionMenu groups={props.groups} label={label} trigger={trigger} />;
}

// A submenu opens its own Sections from its icon, its badge at the icon's corner.
function HeaderSubmenu(
  props: LookProps & { submenu: DeclaredSubmenu },
): ReactElement {
  const { submenu } = props;

  return (
    <ActionMenu
      groups={submenuGroups(submenu)}
      label={submenuLabel(submenu)}
      trigger={submenuTrigger(props)}
    />
  );
}

function submenuTrigger(
  props: LookProps & { submenu: DeclaredSubmenu },
): ReactElement {
  const { icon, badge } = props.submenu;
  const label = spokenLabel(submenuLabel(props.submenu), props.look);

  return (
    <HeaderTrigger
      icon={icon}
      badge={badge}
      label={label}
      size={props.look.size}
    />
  );
}

/*
 * The Tooltip carries the Action's own label, not its spoken name: the subject the spoken name repeats is already on
 * the screen the pointer is over. A menu trigger takes none, since its own popover opens from the same press.
 */
function HeaderAction(props: LookProps & { action: IconAction }): ReactElement {
  const { action, look } = props;

  return (
    <HeaderButtonTooltip label={action.label}>
      <IconButton
        icon={action.icon}
        accessibilityLabel={spokenLabel(action.label, look)}
        disabled={action.disabled}
        onPress={action.onPress}
        size={look.size}
        variant="ghost"
      />
    </HeaderButtonTooltip>
  );
}
