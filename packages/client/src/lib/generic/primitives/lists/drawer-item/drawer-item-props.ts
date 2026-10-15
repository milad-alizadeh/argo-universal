import type { BadgeCount } from '../../../badge-count';
import type { IconName } from '../../../symbols/icon-names';

export interface DrawerItemProps {
  label: string;
  icon: IconName;
  selected: boolean;
  // A count that needs attention: none at zero, and over 99 it shows 99+.
  badge?: BadgeCount;
  onPress: () => void;
}
