/*
 * A header menu as Expo Router's own Android toolbar menu builds it: a stock Compose IconButton that opens the Menu
 * primitive's stock DropdownMenu, a badge in a Compose BadgedBox. A submenu and the overflow (•••) menu are both one.
 */
import { Badge, BadgedBox, Text } from '@expo/ui/jetpack-compose';
import type { ReactElement } from 'react';
import {
  headerMenuActions,
  overflowIcon,
  submenuBadgeText,
  submenuGroups,
  submenuLabel,
  type ActionGroup,
  type DeclaredSubmenu,
} from '#primitives/actions/action';
import { Host } from '#primitives/native/host';
import { MenuDropdown, nativeMenuItems } from '#primitives/overlays/menu';
import {
  HeaderIconButton,
  type HeaderIconButtonProps,
} from './screen-action-button.android';

interface ScreenMenuButtonProps {
  icon: HeaderIconButtonProps['icon'];
  label: string;
  // A submenu among the groups opens as a nested menu.
  groups: ActionGroup[];
  // A count's text, an empty string for a status dot, or nothing for no badge.
  badge?: string;
}

function ScreenMenuButton(props: ScreenMenuButtonProps): ReactElement {
  const items = nativeMenuItems({ actions: headerMenuActions(props.groups) });

  return (
    <Host matchContents>
      <MenuDropdown
        items={items}
        trigger={(open) => <MenuIcon {...props} onPress={open} />}
      />
    </Host>
  );
}

export function ScreenSubmenuButton({
  submenu,
}: {
  submenu: DeclaredSubmenu;
}): ReactElement {
  return (
    <ScreenMenuButton
      icon={submenu.icon}
      label={submenuLabel(submenu)}
      badge={submenuBadgeText(submenu.badge)}
      groups={submenuGroups(submenu)}
    />
  );
}

// The overflow menu has the "more" icon and no badge; with nothing left over there is none.
export function ScreenOverflowButton({
  groups,
  label,
}: Pick<ScreenMenuButtonProps, 'groups' | 'label'>): ReactElement | null {
  if (!groups.length) return null;

  return <ScreenMenuButton icon={overflowIcon} label={label} groups={groups} />;
}

type MenuIconProps = ScreenMenuButtonProps & { onPress: () => void };

function MenuIcon(props: MenuIconProps): ReactElement {
  return (
    <IconBadge text={props.badge}>
      <HeaderIconButton
        icon={props.icon}
        label={props.label}
        onPress={props.onPress}
      />
    </IconBadge>
  );
}

type IconBadgeProps = { text?: string; children: ReactElement };

// BadgedBox puts the badge on the icon's top-end corner; with no badge the icon stands alone.
function IconBadge({ text, children }: IconBadgeProps): ReactElement {
  if (text === undefined) return children;

  return (
    <BadgedBox>
      {children}
      <BadgedBox.Badge>
        <SubmenuBadge text={text} />
      </BadgedBox.Badge>
    </BadgedBox>
  );
}

// Material's Badge, on the Host's error role (Argo's danger): a count in `labelSmall`, as the stock toolbar badge draws it, or a dot.
function SubmenuBadge({ text }: { text: string }): ReactElement {
  return (
    <Badge>
      {text ? <Text style={{ typography: 'labelSmall' }}>{text}</Text> : null}
    </Badge>
  );
}
