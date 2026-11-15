import type { ContextMenuItem, ContextMenuProps } from './context-menu-props';
import type { NativeMenuItem, NativeMenuSection } from './menu-native-items';
import { pressOf, subtitleOf } from './native-item-fields';

// Only a checkmark item carries `checked`.
const checkedOf = (item: ContextMenuItem): Pick<NativeMenuItem, 'checked'> =>
  item.selected === undefined ? {} : { checked: item.selected };

function contextMenuItem(item: ContextMenuItem): NativeMenuItem {
  return {
    id: item.id ?? item.label,
    title: item.label,
    ...checkedOf(item),
    ...subtitleOf(item),
    icon: item.icon,
    tone: item.tone,
    disabled: Boolean(item.disabled),
    choose: pressOf(item),
  };
}

// Each group is a section of the system menu; iOS heads the first with the menu's title.
export function contextMenuSections(
  props: Pick<ContextMenuProps, 'groups' | 'title' | 'groupTitles'>,
): NativeMenuSection[] {
  return props.groups.map((group, index) => ({
    title: groupTitle(props, index),
    items: group.map(contextMenuItem),
  }));
}

function groupTitle(
  props: Pick<ContextMenuProps, 'title' | 'groupTitles'>,
  index: number,
): string | undefined {
  return props.groupTitles?.[index] ?? firstGroupTitle(props.title, index);
}

function firstGroupTitle(
  title: string | undefined,
  index: number,
): string | undefined {
  return index === 0 ? title : undefined;
}
