import type { BadgeCount } from '../../../badge-count';
import type { IconSymbol } from '../../../symbols/icon-symbol';

export interface DrawerItemProps {
  label: string;
  icon: IconSymbol;
  selected: boolean;
  // A count that needs attention: none at zero, and over 99 it shows 99+.
  badge?: BadgeCount;
  onPress: () => void;
}
