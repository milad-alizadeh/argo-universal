import type { ReactElement } from 'react';
import type { IconName } from '../../../symbols/icon-names';

export interface DrawerItemProps {
  title: string;
  icon: IconName;
  selected: boolean;
  // A count that needs attention, drawn by the caller, and what a screen reader says for it.
  badge?: { element: ReactElement; label: string };
  onPress: () => void;
}
