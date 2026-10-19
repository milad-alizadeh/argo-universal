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
} from '#primitives/actions/action-list';
import { Host } from '#primitives/native/host';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { MenuDropdown, nativeMenuItems } from '#primitives/overlays/menu';
import {
  HeaderIconButton,
  type HeaderIconButtonProps,
} from './page-action-button.android';

interface PageMenuButtonProps {
  icon: HeaderIconButtonProps['icon'];
  label: string;
  // A submenu among the groups opens as a nested menu.
  groups: ActionGroup[];
  // A count's text, an empty string for a status dot, or nothing for no badge.
  badge?: string;
}

function PageMenuButton(props: PageMenuButtonProps): ReactElement {
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

export function PageSubmenuButton({
  submenu,
}: {
  submenu: DeclaredSubmenu;
}): ReactElement {
  return (
    <PageMenuButton
      icon={submenu.icon}
      label={submenuLabel(submenu)}
      badge={submenuBadgeText(submenu.badge)}
      groups={submenuGroups(submenu)}
    />
  );
}

// The overflow menu has the "more" icon and no badge; with nothing left over there is none.
export function PageOverflowButton({
  groups,
  label,
}: Pick<PageMenuButtonProps, 'groups' | 'label'>): ReactElement | null {
  if (!groups.length) return null;

  return <PageMenuButton icon={overflowIcon} label={label} groups={groups} />;
}

type MenuIconProps = PageMenuButtonProps & { onPress: () => void };

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

// Material's Badge in Argo's danger colours: a count in `labelSmall`, as the stock toolbar badge draws it, or a dot.
function SubmenuBadge({ text }: { text: string }): ReactElement {
  const { roles } = useMaterialPalette();

  return (
    <Badge containerColor={roles.error} contentColor={roles.onError}>
      {text ? <Text style={{ typography: 'labelSmall' }}>{text}</Text> : null}
    </Badge>
  );
}
