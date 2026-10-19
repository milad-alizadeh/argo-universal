import type { ReactElement } from 'react';
import type { NativeMenuItem } from './menu-native-items';

export interface MenuDropdownProps {
  items: NativeMenuItem[];
  // The element the menu opens from; it calls `open` when pressed.
  trigger: (open: () => void) => ReactElement;
}
