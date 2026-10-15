import type { IconName } from '../../../symbols/icon-names';

export interface DrawerItemProps {
  label: string;
  icon: IconName;
  selected: boolean;
  // A count that needs attention: none at zero, and over 99 it shows 99+.
  badge?: number;
  // What a screen reader says for the badge, such as "3 Sessions need attention"; the count when absent.
  badgeLabel?: string;
  onPress: () => void;
}
