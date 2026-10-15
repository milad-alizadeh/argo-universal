import type * as React from 'react';
import { HeaderButton, HeaderItems } from '#lib/product/header-button';
import { Menu, type MenuAction } from '#primitives/overlays/menu';
import type { ToolbarIconName } from './toolbar-icon';

/*
 * One header item, as data: iOS draws it as a stock bar button item with its SF Symbol, sized and placed by the
 * system like the back chevron; Android's drawer header and the web's JS header draw it as a `HeaderButton`.
 */
export interface HeaderItem {
  icon: ToolbarIconName;
  accessibilityLabel: string;
  onPress?: () => void;
  // Choices the item opens, the current one checked.
  menu?: readonly MenuAction[];
  // Sessions need attention, or a filter other than the default is set.
  dot?: 'attention' | 'filter';
}

interface HeaderItemButtonProps {
  item: HeaderItem;
  // Paired trailing items are narrower than a lone leading one.
  paired?: boolean;
}

// The item as a JS header button, opening its menu when it has one.
export function HeaderItemButton({
  item,
  paired = false,
}: HeaderItemButtonProps): React.JSX.Element {
  const { menu, ...button } = item;
  const trigger = <HeaderButton {...button} paired={paired} />;

  if (!menu) return trigger;

  return (
    <ItemMenu menu={menu} label={button.accessibilityLabel} trigger={trigger} />
  );
}

interface ItemMenuProps {
  menu: readonly MenuAction[];
  label: string;
  trigger: React.JSX.Element;
}

// A single-choice menu, so the web marks the checked choice as a radio; the Menu hands its trigger the press and ARIA props.
function ItemMenu({ menu, label, trigger }: ItemMenuProps): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel={label}
      value={menu.find((choice) => choice.selected)?.label ?? ''}
      options={menu.map(({ label: value }) => ({ value, label: value }))}
      onValueChange={(value) =>
        menu.find((choice) => choice.label === value)?.onPress()
      }
      trigger={trigger}
    />
  );
}

// Trailing items as JS header buttons, in one row.
export function HeaderItemRow({
  items,
}: {
  items: readonly HeaderItem[];
}): React.JSX.Element {
  return (
    <HeaderItems>
      {items.map((item) => (
        <HeaderItemButton key={item.accessibilityLabel} item={item} paired />
      ))}
    </HeaderItems>
  );
}
