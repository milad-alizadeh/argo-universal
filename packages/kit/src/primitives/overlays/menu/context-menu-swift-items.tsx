import type { ReactElement } from 'react';
import type { NativeMenuSection } from './menu-native-items';

// Only iOS draws a menu's rows as SwiftUI views (context-menu-swift-items.ios); elsewhere there are none.
export function swiftMenuSections(
  _sections: NativeMenuSection[],
): ReactElement[] {
  return [];
}
