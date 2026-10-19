import type {
  MenuAction as NativeMenuAction,
  NativeActionEvent,
} from '@expo/ui/community/menu';
import type { SFSymbol } from 'sf-symbols-typescript';
import { isCustomSymbol } from '../../../symbols/custom-symbols';
import { drawnSymbol } from '../../../symbols/drawn-symbol';
import { type IconName, iconSymbols } from '../../../symbols/icon-names';
import {
  choosableItems,
  type NativeMenuItem,
  type NativeMenuSection,
} from './menu-native-items';

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

// MenuAction.subactions without displayInline draw a nested SwiftUI Menu, titled and with the row's symbol.
function submenuAction(
  item: NativeMenuItem,
  sections: NativeMenuSection[],
): NativeMenuAction {
  return {
    id: item.id,
    title: item.title,
    subactions: sectionActions(sections),
    ...itemImage(item.icon),
  };
}

// The system menus take SF Symbol names only, so Argo's custom and Tabler symbols draw none.
export const menuSymbol = (icon: IconName | undefined): SFSymbol | undefined =>
  icon ? systemSymbol(icon) : undefined;

function systemSymbol(icon: IconName): SFSymbol | undefined {
  const symbol = drawnSymbol(iconSymbols[icon]);

  if (symbol.kind === 'tabler' || isCustomSymbol(symbol.sf)) return undefined;

  return symbol.sf;
}

// MenuAction.image: an SF Symbol name, which the system draws before the title, after its check.
function itemImage(
  icon: IconName | undefined,
): Pick<NativeMenuAction, 'image'> {
  const image = menuSymbol(icon);

  return image ? { image } : {};
}

// MenuAction.state: 'on' draws the system check; a row that never carries it has no state.
const checkState = (
  checked: boolean | undefined,
): Pick<NativeMenuAction, 'state'> =>
  checked === undefined ? {} : { state: checked ? 'on' : 'off' };
