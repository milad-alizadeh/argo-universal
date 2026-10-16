import type { NativeMenuItem } from './menu-native-items';

export interface MenuDropdownItemsProps {
  items: NativeMenuItem[];
  // Called before the chosen row runs, so the menu closes first.
  onChosen: () => void;
}
