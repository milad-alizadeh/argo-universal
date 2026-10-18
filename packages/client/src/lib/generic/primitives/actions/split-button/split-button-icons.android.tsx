import { Icon } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import expandMore from '../../../symbols/assets/expand-more.xml';

// A native Compose icon at the control role's size, so the whole stock button takes the tap; it inherits the button's content colour.
export function ChevronIcon(): React.JSX.Element {
  return <Icon source={expandMore} />;
}
