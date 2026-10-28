import { Button, Menu, Section, Toggle } from '@expo/ui/swift-ui';
import { disabled } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import {
  nativeSectionKey,
  type NativeMenuItem,
  type NativeMenuSection,
} from './menu-native-items';
import { countedTitle } from './menu-props';
import { menuSymbol } from './menu-view-actions.ios';

/*
 * A context menu's rows as SwiftUI views, as Expo UI's MenuView draws its actions: each section a SwiftUI Section
 * headed by its title, a checkable row a Toggle, a row with sections of its own a nested Menu, and any other row a
 * Button with its SF Symbol, `destructive` for a danger row.
 */
export function swiftMenuSections(
  sections: NativeMenuSection[],
): ReactElement[] {
  return sections.map((section) => (
    <Section key={nativeSectionKey(section)} title={section.title ?? ''}>
      {section.items.map(swiftMenuItem)}
    </Section>
  ));
}

// A disabled row greys out and cannot be chosen.
const off = (
  item: NativeMenuItem,
): ReturnType<typeof disabled>[] | undefined =>
  item.disabled ? [disabled(true)] : undefined;

const submenu = (
  item: NativeMenuItem,
  sections: NativeMenuSection[],
): ReactElement => (
  <Menu
    key={item.id}
    label={countedTitle(item.title, item.count)}
    systemImage={menuSymbol(item.icon)}
  >
    {swiftMenuSections(sections)}
  </Menu>
);

const toggle = (item: NativeMenuItem, isOn: boolean): ReactElement => (
  <Toggle
    key={item.id}
    label={item.title}
    systemImage={menuSymbol(item.icon)}
    isOn={isOn}
    onIsOnChange={item.choose}
    modifiers={off(item)}
  />
);

const button = (item: NativeMenuItem): ReactElement => (
  <Button
    key={item.id}
    label={item.title}
    systemImage={menuSymbol(item.icon)}
    role={item.tone === 'danger' ? 'destructive' : undefined}
    onPress={item.choose}
    modifiers={off(item)}
  />
);

function swiftMenuItem(item: NativeMenuItem): ReactElement {
  if (item.submenu) return submenu(item, item.submenu);

  return item.checked === undefined ? button(item) : toggle(item, item.checked);
}
