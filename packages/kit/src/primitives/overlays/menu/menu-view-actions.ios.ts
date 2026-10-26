import type {
  MenuAction as NativeMenuAction,
  NativeActionEvent,
} from '@expo/ui/community/menu';
import type { SFSymbol } from 'sf-symbols-typescript';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import { iosSystemName } from '../../../symbols/ios-image';
import {
  choosableItems,
  type NativeMenuItem,
  type NativeMenuSection,
} from './menu-native-items';
import { countedTitle } from './menu-props';

// The rows of Expo UI's MenuView, shared by the Menu and the long-press ContextMenu.

// MenuAction.displayInline draws `subactions` as a SwiftUI Section, its title as the Section's header; an empty title draws none.
export function sectionAction(
  section: NativeMenuSection,
  index: number,
): NativeMenuAction {
  return {
    id: `argo.menu.section.${index}`,
    title: section.title ?? '',
    displayInline: true,
    subactions: section.items.map(menuAction),
  };
}

// MenuView reports the chosen row by its id, a nested menu's rows included.
export function runAction(
  items: NativeMenuItem[],
  event: NativeActionEvent,
): void {
  choosableItems(items)
    .find((item) => item.id === event.nativeEvent.event)
    ?.choose();
}

// Sections draw as SwiftUI Sections, whose ids are keys among their siblings only; one section needs none.
export function sectionActions(
  sections: NativeMenuSection[],
): NativeMenuAction[] {
  if (sections.length > 1) return sections.map(sectionAction);

  return sections.flatMap((section) => section.items.map(menuAction));
}

export function menuAction(item: NativeMenuItem): NativeMenuAction {
  if (item.submenu) return submenuAction(item, item.submenu);

  return {
    id: item.id,
    title: item.title,
    ...checkState(item.checked),
    attributes: {
      disabled: item.disabled,
      destructive: item.tone === 'danger',
    },
    ...itemImage(item.icon),
  };
}

// MenuAction.subactions without displayInline draw a nested SwiftUI Menu, titled and with the row's symbol; MenuAction has no subtitle, so the title carries the count.
function submenuAction(
  item: NativeMenuItem,
  sections: NativeMenuSection[],
): NativeMenuAction {
  return {
    id: item.id,
    title: countedTitle(item.title, item.count),
    subactions: sectionActions(sections),
    ...itemImage(item.icon),
  };
}

// MenuView's iOS rows take SF Symbol names only, so an asset image (Argo's own symbol) or SVG icon draws none.
export function menuSymbol(icon: IconSymbol | undefined): SFSymbol | undefined {
  return icon ? iosSystemName(icon) : undefined;
}

// MenuAction.image: an SF Symbol name, which the system draws before the title, after its check.
function itemImage(
  icon: IconSymbol | undefined,
): Pick<NativeMenuAction, 'image'> {
  const image = menuSymbol(icon);

  return image ? { image } : {};
}

// MenuAction.state: 'on' draws the system check; a row that never carries it has no state.
const checkState = (
  checked: boolean | undefined,
): Pick<NativeMenuAction, 'state'> =>
  checked === undefined ? {} : { state: checked ? 'on' : 'off' };
