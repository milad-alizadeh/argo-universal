import type { ReactElement } from 'react';
import type { IconSymbol } from '#kit/symbols/icon-symbol';
import {
  Menu,
  type MenuEntry,
  type MenuProps,
} from '#primitives/overlays/menu';
import {
  submenuGroups,
  isSubmenu,
  type ActionGroup,
  type DeclaredEntry,
} from './action-declarations';
import { submenuCountText, submenuLabel } from './submenu-badge';

/*
 * Each group's first entry starts a Section, so the menu keeps the Sections' titles and separators; a submenu keeps
 * its label and icon and nests its own Sections.
 */
export function headerMenuActions(groups: ActionGroup[]): MenuEntry[] {
  return groups.flatMap((group) =>
    group.actions.map((entry, index) => ({
      ...menuEntry(entry),
      section: index === 0 ? { title: group.title } : undefined,
    })),
  );
}

// A folded submenu's row keeps its count after the label and in its spoken name.
function menuEntry(entry: DeclaredEntry): MenuEntry {
  if (!isSubmenu(entry)) return entry;

  return {
    id: entry.id,
    wrap: entry.wrap,
    label: entry.label,
    accessibilityLabel: submenuLabel(entry),
    icon: entry.icon,
    count: submenuCountText(entry.badge),
    actions: headerMenuActions(submenuGroups(entry)),
  };
}

interface ActionMenuProps {
  groups: ActionGroup[];
  label: string;
  trigger: ReactElement;
  // Which edge of the trigger the menu lines up with: the end, as right-hand header buttons need, unless said.
  align?: MenuProps['align'];
  toolbarTitle?: boolean;
}

// The one header menu: the overflow's and each submenu's.
export function ActionMenu(props: ActionMenuProps): ReactElement {
  return (
    <Menu
      accessibilityLabel={props.label}
      trigger={props.trigger}
      actions={headerMenuActions(props.groups)}
      align={props.align}
      toolbarTitle={props.toolbarTitle}
    />
  );
}

// Android's overflow menu opens from vertical dots, as its stock toolbar's does.
export const overflowIcon = {
  sf: 'ellipsis',
  material: 'more_vert',
} satisfies IconSymbol;
