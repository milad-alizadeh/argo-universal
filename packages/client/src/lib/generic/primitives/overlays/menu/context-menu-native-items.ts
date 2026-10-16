import type { ContextMenuItem, ContextMenuProps } from './context-menu-props';
import type { NativeMenuItem, NativeMenuSection } from './menu-native-items';

const nothing = (): void => undefined;

function contextMenuItem(item: ContextMenuItem): NativeMenuItem {
  const disabled = Boolean(item.disabled);

  return {
    id: item.label,
    title: item.label,
    icon: item.icon,
    disabled,
    choose: disabled ? nothing : item.onPress,
  };
}

// Each group is a section of the system menu; iOS heads the first with the menu's title.
export function contextMenuSections(
  props: Pick<ContextMenuProps, 'groups' | 'title'>,
): NativeMenuSection[] {
  return props.groups.map((group, index) => ({
    title: index === 0 ? props.title : undefined,
    items: group.map(contextMenuItem),
  }));
}
